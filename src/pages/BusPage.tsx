import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiMapPin, FiNavigation } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchNearbyOsmPlaces } from '../utils/osm';

type BusStep = {
  title: string;
  detail: string;
};

type PlacePick = {
  label: string;
  lat: number;
  lng: number;
};

type Suggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

const fetchSuggestionsInIndia = async (q: string): Promise<Suggestion[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ place_id: number; lat: string; lon: string; display_name: string }>;
  return data
    .map((d) => ({
      id: String(d.place_id),
      label: d.display_name,
      lat: Number(d.lat),
      lng: Number(d.lon),
    }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
};

const BusPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { location, loading: locationLoading, error: locationError, getCurrentLocation } = useGeolocation();

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromPick, setFromPick] = useState<PlacePick | null>(null);
  const [toPick, setToPick] = useState<PlacePick | null>(null);

  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);
  const [showFromSug, setShowFromSug] = useState(false);
  const [showToSug, setShowToSug] = useState(false);

  const [loadingStands, setLoadingStands] = useState(false);
  const [standsError, setStandsError] = useState<string | null>(null);
  const [fromBusStands, setFromBusStands] = useState<Awaited<ReturnType<typeof fetchNearbyOsmPlaces>>>([]);

  const [showRoute, setShowRoute] = useState(false);
  const [routeUiError, setRouteUiError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    const name = searchParams.get('name');
    const lat = Number(searchParams.get('dLat'));
    const lng = Number(searchParams.get('dLng'));

    if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
      const pick = { label: name, lat, lng };
      setToPick(pick);
      setToQuery(name);
    }
  }, [searchParams]);

  const fromLabel = fromPick?.label || fromQuery.trim() || 'From';
  const toLabel = toPick?.label || toQuery.trim() || 'To';

  useEffect(() => {
    const q = fromQuery.trim();
    if (q.length < 3) {
      setFromSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const items = await fetchSuggestionsInIndia(q);
      setFromSuggestions(items);
    }, 350);

    return () => clearTimeout(timer);
  }, [fromQuery]);

  useEffect(() => {
    const q = toQuery.trim();
    if (q.length < 3) {
      setToSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const items = await fetchSuggestionsInIndia(q);
      setToSuggestions(items);
    }, 350);

    return () => clearTimeout(timer);
  }, [toQuery]);

  useEffect(() => {
    const from = fromPick;
    if (!from) return;

    setLoadingStands(true);
    setStandsError(null);
    fetchNearbyOsmPlaces(
      { lat: from.lat, lng: from.lng },
      {
        radiusMeters: 8000,
        kinds: ['bus_station'],
        limit: 10,
      }
    )
      .then((res) => setFromBusStands(res))
      .catch((e) => setStandsError(e instanceof Error ? e.message : 'Failed to fetch bus stands'))
      .finally(() => setLoadingStands(false));
  }, [fromPick]);

  const bestStand = useMemo(() => {
    if (fromBusStands.length === 0) return null;
    // prefer amenity=bus_station by name
    const byAmenity = fromBusStands.find((p) => p.tags?.amenity === 'bus_station');
    return byAmenity ?? fromBusStands[0];
  }, [fromBusStands]);

  const steps: BusStep[] = useMemo(() => {
    const standName = bestStand?.name ?? 'Nearest bus stand in the From city';
    const standAddress = bestStand?.address ?? '';

    return [
      {
        title: 'Step 1: Choose your route',
        detail: `From: ${fromLabel} → To: ${toLabel}`,
      },
      {
        title: 'Step 2: Go to the bus stand',
        detail: `From ${fromLabel}, go to: ${standName}${standAddress ? `, ${standAddress}` : ''}.`,
      },
      {
        title: 'Step 3: Platform / Bay details',
        detail: `Ask at the enquiry counter for the platform/bay towards ${toLabel}. Platform numbers can change.`,
      },
      {
        title: 'Step 4: Ticket + boarding',
        detail: 'Operator: KSRTC / State RTC / Private. Take a ticket (or show booking) and board. Reach 20–30 minutes early for platform confirmation.',
      },
      {
        title: 'Step 5: Arrival',
        detail: `Get down at ${toLabel} and follow local sign boards to reach your exact spot.`,
      },
    ];
  }, [bestStand, fromLabel, toLabel]);

  const openInAppDirections = () => {
    if (!location) return;
    if (!toPick) return;
    navigate(`/map?oLat=${location.lat}&oLng=${location.lng}&dLat=${toPick.lat}&dLng=${toPick.lng}`);
  };

  const onShowRoute = () => {
    setRouteUiError(null);
    if (!fromPick) {
      setRouteUiError('Select a From place from suggestions.');
      return;
    }
    if (!toPick) {
      setRouteUiError('Select a To place from suggestions.');
      return;
    }
    setShowRoute(true);
  };

  return (
    <div className="min-h-screen bg-primary-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <FiArrowLeft />
          Back
        </button>

        <h1 className="text-2xl font-bold mt-4">Bus</h1>
        <p className="text-gray-300 mt-1">Bus / Route Helper</p>

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

        <div className="mt-6 bg-secondary border border-primary-800 rounded-2xl p-4">
          <div className="text-sm text-gray-300 mb-3">
            Enter from and to locations to see map directions (can be used like KSRTC route helper).
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="bg-primary-900/40 border border-primary-800 rounded-xl p-3 relative">
              <input
                value={fromQuery}
                onChange={(e) => {
                  setFromQuery(e.target.value);
                  setFromPick(null);
                  setShowFromSug(true);
                  setShowRoute(false);
                }}
                onFocus={() => setShowFromSug(true)}
                onBlur={() => setTimeout(() => setShowFromSug(false), 120)}
                placeholder="From (e.g., Mysore)"
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-primary-800 focus:outline-none focus:border-primary-600"
              />

              {showFromSug && fromSuggestions.length > 0 && (
                <div className="absolute left-3 right-3 top-[84px] bg-secondary border border-primary-800 rounded-xl overflow-hidden z-10">
                  {fromSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setFromPick({ label: s.label, lat: s.lat, lng: s.lng });
                        setFromQuery(s.label);
                        setShowFromSug(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary-900/40"
                    >
                      <div className="text-sm text-gray-100">{s.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {loadingStands && <div className="text-xs text-gray-400 mt-2">Finding nearby bus stands…</div>}
              {standsError && <div className="text-xs text-red-300 mt-2">{standsError}</div>}
              {!loadingStands && !standsError && fromPick && bestStand && (
                <div className="text-xs text-gray-400 mt-2">
                  Suggested stand: {bestStand.name}
                </div>
              )}
            </div>

            <div className="bg-primary-900/40 border border-primary-800 rounded-xl p-3 relative">
              <input
                value={toQuery}
                onChange={(e) => {
                  setToQuery(e.target.value);
                  setToPick(null);
                  setShowToSug(true);
                  setShowRoute(false);
                }}
                onFocus={() => setShowToSug(true)}
                onBlur={() => setTimeout(() => setShowToSug(false), 120)}
                placeholder="To (e.g., Mandya)"
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-primary-800 focus:outline-none focus:border-primary-600"
              />

              {showToSug && toSuggestions.length > 0 && (
                <div className="absolute left-3 right-3 top-[84px] bg-secondary border border-primary-800 rounded-xl overflow-hidden z-10">
                  {toSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setToPick({ label: s.label, lat: s.lat, lng: s.lng });
                        setToQuery(s.label);
                        setShowToSug(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary-900/40"
                    >
                      <div className="text-sm text-gray-100">{s.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {!toPick && <div className="text-xs text-gray-400 mt-2">Pick a suggestion.</div>}
            </div>

            <button
              type="button"
              onClick={onShowRoute}
              className="w-full h-[52px] rounded-xl bg-accent-600 hover:bg-accent-500 text-black font-semibold"
            >
              Show Route
            </button>
          </div>

          {routeUiError && <div className="text-sm text-red-300 mt-3">{routeUiError}</div>}

          {showRoute && (
            <>
              <div className="mt-4 text-gray-300">
                {steps.map((s) => (
                  <div key={s.title} className="text-sm mt-1">
                    <span className="font-semibold">{s.title}:</span> {s.detail}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={openInAppDirections}
                disabled={!location || !toPick}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiNavigation />
                Open Directions in Map
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusPage;
