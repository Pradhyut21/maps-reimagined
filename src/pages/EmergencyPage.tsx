import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiArrowLeft, FiMapPin, FiNavigation, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../utils/googleMaps';
import { fetchNearbyOsmPlaces } from '../utils/osm';

const EmergencyPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    location,
    error: locationError,
    loading: locationLoading,
    getCurrentLocation,
  } = useGeolocation();

  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Awaited<ReturnType<typeof fetchNearbyOsmPlaces>>>([]);
  const [police, setPolice] = useState<Awaited<ReturnType<typeof fetchNearbyOsmPlaces>>>([]);

  const fetchEmergencyPlaces = async () => {
    if (!location) return;
    setLoadingPlaces(true);
    setPlacesError(null);
    try {
      const [h, p] = await Promise.all([
        fetchNearbyOsmPlaces({ lat: location.lat, lng: location.lng }, { radiusMeters: 8000, kinds: ['hospital'], limit: 10 }),
        fetchNearbyOsmPlaces({ lat: location.lat, lng: location.lng }, { radiusMeters: 8000, kinds: ['police'], limit: 10 }),
      ]);
      setHospitals(h);
      setPolice(p);
    } catch (e) {
      setPlacesError(e instanceof Error ? e.message : 'Failed to fetch emergency places');
    } finally {
      setLoadingPlaces(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (location) {
      fetchEmergencyPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const hospitalList = useMemo(() => {
    if (!location) return [];
    return hospitals
      .map((place) => ({
        place,
        distanceKm: calculateDistance(location.lat, location.lng, place.lat, place.lng),
      }))
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm));
  }, [hospitals, location]);

  const policeList = useMemo(() => {
    if (!location) return [];
    return police
      .map((place) => ({
        place,
        distanceKm: calculateDistance(location.lat, location.lng, place.lat, place.lng),
      }))
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm));
  }, [police, location]);

  const onDirections = (lat: number, lng: number) => {
    if (!location) return;
    navigate(`/map?oLat=${location.lat}&oLng=${location.lng}&dLat=${lat}&dLng=${lng}`);
  };

  const refresh = () => {
    if (!location) {
      getCurrentLocation();
      return;
    }
    fetchEmergencyPlaces();
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

        <div className="flex items-start justify-between gap-3 mt-4">
          <div>
            <h1 className="text-2xl font-bold">Emergency</h1>
            <p className="text-gray-300 mt-1">Nearby hospitals and police stations based on your live location.</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={locationLoading || loadingPlaces}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-800 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw />
            Refresh
          </button>
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
          {placesError && (
            <div className="bg-destructive/20 border border-destructive/40 rounded-xl p-4 mt-4">
              <div className="font-semibold">Places error</div>
              <div className="text-gray-200 mt-1">{placesError}</div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-secondary border border-primary-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hospitals</h2>
              <FiAlertTriangle className="text-red-400" />
            </div>

            {loadingPlaces && <div className="text-gray-300 mt-3">Loading…</div>}
            {!loadingPlaces && location && hospitalList.length === 0 && !placesError && (
              <div className="text-gray-300 mt-3">No hospitals found nearby.</div>
            )}

            <div className="mt-3 space-y-3">
              {hospitalList.map(({ place, distanceKm }) => (
                <div key={place.id} className="bg-primary-900/40 border border-primary-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{place.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{place.address || ' '}</div>
                    </div>
                    <div className="text-xs text-gray-300 whitespace-nowrap">{distanceKm} km</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDirections(place.lat, place.lng)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-800 hover:bg-primary-700"
                  >
                    <FiNavigation />
                    Directions
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary border border-primary-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Police</h2>
              <FiAlertTriangle className="text-red-400" />
            </div>

            {loadingPlaces && <div className="text-gray-300 mt-3">Loading…</div>}
            {!loadingPlaces && location && policeList.length === 0 && !placesError && (
              <div className="text-gray-300 mt-3">No police stations found nearby.</div>
            )}

            <div className="mt-3 space-y-3">
              {policeList.map(({ place, distanceKm }) => (
                <div key={place.id} className="bg-primary-900/40 border border-primary-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{place.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{place.address || ' '}</div>
                    </div>
                    <div className="text-xs text-gray-300 whitespace-nowrap">{distanceKm} km</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDirections(place.lat, place.lng)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-800 hover:bg-primary-700"
                  >
                    <FiNavigation />
                    Directions
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;
