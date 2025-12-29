import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiBell, FiMapPin, FiSend, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import { useGeolocation } from '../hooks/useGeolocation';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

type GeofenceAlert = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  active: boolean;
  triggered: boolean;
};

const toRad = (v: number) => (v * Math.PI) / 180;
const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
};

const parseRadiusMeters = (text: string) => {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(km|kms|kilometers|kilometres|m|meters|metres)\b/i);
  if (!m) return 500;
  const num = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(num)) return 500;
  if (unit.startsWith('k')) return Math.round(num * 1000);
  return Math.round(num);
};

const extractPlaceQuery = (text: string) => {
  // very small heuristic: "near X" or "to X" or "at X"
  const m = text.match(/\b(?:near|to|at)\s+(.+?)(?:\s+within\b|\s+in\b|$)/i);
  if (m?.[1]) return m[1].trim();
  return text.replace(/^(alert|notify|remind)\b/i, '').trim() || 'destination';
};

const geocodeNominatim = async (q: string) => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      // Nominatim requires identifying UA; browser limits this header, but setting Accept is ok.
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) throw new Error('No results found');
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    label: data[0].display_name,
  };
};

const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { location, loading: locationLoading, error: locationError, getCurrentLocation } = useGeolocation();

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'seed-1',
      role: 'assistant',
      text: 'Tell me: “alert me when I’m near <place> within 500m”. I will notify you when you are close.',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [busy, setBusy] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    // Start watching location for alerts
    if (!navigator.geolocation) return;
    if (watchIdRef.current != null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setAlerts((prev) =>
          prev.map((a) => {
            if (!a.active || a.triggered) return a;
            const d = distanceMeters(lat, lng, a.lat, a.lng);
            if (d <= a.radiusMeters) {
              // notify
              const msg = `You are near ${a.label} (within ${a.radiusMeters}m).`;
              if ('Notification' in window) {
                // best effort
                if (Notification.permission === 'granted') {
                  new Notification('Travel Alert', { body: msg });
                }
              }
              // also show in chat
              setMessages((m) => [
                ...m,
                { id: `${Date.now()}-alert`, role: 'assistant', text: msg, createdAt: Date.now() },
              ]);
              return { ...a, triggered: true, active: false };
            }
            return a;
          })
        );
      },
      () => {
        // ignore here; UI shows locationError from hook
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8000,
      }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const canSend = input.trim().length > 0 && !busy;

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    await Notification.requestPermission();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-u`, role: 'user', text, createdAt: Date.now() },
    ]);

    setBusy(true);
    try {
      await requestNotificationPermission();

      // Minimal "AI" intent: create geofence alert if message contains "alert" / "notify" / "remind"
      const wantsAlert = /\b(alert|notify|remind)\b/i.test(text);
      if (!wantsAlert) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: 'assistant',
            text: 'I can create a travel alert. Try: “alert me when I’m near Majestic within 500m”.',
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      const radius = parseRadiusMeters(text);
      const query = extractPlaceQuery(text);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a1`,
          role: 'assistant',
          text: `Okay. Setting an alert near “${query}” within ${radius}m…`,
          createdAt: Date.now(),
        },
      ]);

      const geo = await geocodeNominatim(query);
      const alert: GeofenceAlert = {
        id: `${Date.now()}-g`,
        label: geo.label,
        lat: geo.lat,
        lng: geo.lng,
        radiusMeters: radius,
        active: true,
        triggered: false,
      };

      setAlerts((prev) => [alert, ...prev]);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a2`,
          role: 'assistant',
          text: `Alert set. I will notify you when you are within ${radius}m of: ${geo.label}.`,
          createdAt: Date.now(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ae`,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Something went wrong',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const activeAlerts = useMemo(() => alerts.filter((a) => a.active).length, [alerts]);

  return (
    <div className="min-h-screen bg-primary-950 text-white">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <FiArrowLeft />
          Back
        </button>

        <div className="flex items-start justify-between gap-3 mt-4">
          <div>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="text-gray-300 mt-1">
              Travel alerts (geofence): get notified when you are near a place.
            </p>
          </div>
          <div className="text-sm text-gray-300 inline-flex items-center gap-2">
            <FiBell />
            {activeAlerts} active
          </div>
        </div>

        <div className="mt-4">
          {locationLoading && <div className="text-gray-300">Getting your location…</div>}
          {!locationLoading && locationError && (
            <div className="bg-destructive/20 border border-destructive/40 rounded-xl p-4">
              <div className="font-semibold">Location error</div>
              <div className="text-gray-200 mt-1">{locationError}</div>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="mt-3 px-4 py-2 rounded-lg bg-primary-800 hover:bg-primary-700"
              >
                Try again
              </button>
            </div>
          )}
          {!locationLoading && location && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <FiMapPin />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-secondary border border-primary-800 rounded-2xl p-4 flex flex-col min-h-[420px]">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] bg-accent-600 text-black rounded-2xl px-4 py-2'
                        : 'max-w-[85%] bg-primary-900/50 border border-primary-800 rounded-2xl px-4 py-2'
                    }
                  >
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Example: alert me near Majestic within 500m"
                className="flex-1 px-4 py-3 rounded-xl bg-primary-900/40 border border-primary-800 focus:outline-none focus:border-primary-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="px-4 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <FiSend />
                Send
              </button>
            </div>
          </div>

          <div className="bg-secondary border border-primary-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Alerts</h2>
              <button
                type="button"
                onClick={() => setAlerts([])}
                className="text-gray-300 hover:text-white inline-flex items-center gap-2"
              >
                <FiTrash2 />
                Clear
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-sm text-gray-400">No alerts set.</div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="bg-primary-900/40 border border-primary-800 rounded-xl p-3">
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Radius: {a.radiusMeters}m
                    </div>
                    <div className="text-xs mt-2">
                      Status: {a.triggered ? 'Triggered' : a.active ? 'Active' : 'Inactive'}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAlerts((prev) =>
                            prev.map((x) =>
                              x.id === a.id ? { ...x, active: !x.active, triggered: false } : x
                            )
                          )
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-primary-800 hover:bg-primary-700"
                      >
                        {a.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                        className="px-3 py-2 rounded-lg bg-destructive/30 hover:bg-destructive/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
