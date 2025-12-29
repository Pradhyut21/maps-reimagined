import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiMapPin, FiNavigation, FiSearch, FiStar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../utils/googleMaps';
import { fetchNearbyOsmPlaces } from '../utils/osm';

const RestaurantsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    location,
    error: locationError,
    loading: locationLoading,
    getCurrentLocation,
  } = useGeolocation();

  const [places, setPlaces] = useState<Awaited<ReturnType<typeof fetchNearbyOsmPlaces>>>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const inFlightRef = useRef(false);
  const lastRequestKeyRef = useRef<string | null>(null);

  const canSearch = !!location && !locationLoading && !loadingPlaces;

  const fetchPlaces = async () => {
    if (!location) return;

    const requestKey = `${location.lat.toFixed(5)},${location.lng.toFixed(5)}|${searchQuery.trim().toLowerCase()}`;
    if (inFlightRef.current) return;
    if (lastRequestKeyRef.current === requestKey) return;

    inFlightRef.current = true;
    lastRequestKeyRef.current = requestKey;

    setLoadingPlaces(true);
    setPlacesError(null);
    try {
      const results = await fetchNearbyOsmPlaces(
        { lat: location.lat, lng: location.lng },
        {
          radiusMeters: 7000,
          kinds: ['restaurant'],
          query: searchQuery,
          limit: 10,
        }
      );
      setPlaces(results);
    } catch (e) {
      setPlacesError(e instanceof Error ? e.message : 'Failed to fetch nearby restaurants');
    } finally {
      setLoadingPlaces(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (location) {
      fetchPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const derived = useMemo(() => {
    if (!location) return [];

    return places
      .map((p) => {
        const distanceKm = calculateDistance(
          location.lat,
          location.lng,
          p.lat,
          p.lng
        );

        return {
          place: p,
          distanceKm,
        };
      })
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm));
  }, [places, location]);

  const refresh = () => {
    if (!location) {
      getCurrentLocation();
      return;
    }
    fetchPlaces();
  };

  const onDirections = (p: (typeof places)[number]) => {
    if (!location) return;
    navigate(`/map?oLat=${location.lat}&oLng=${location.lng}&dLat=${p.lat}&dLng=${p.lng}`);
  };

  return (
    <div className="min-h-screen bg-primary-950 text-white">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <FiArrowLeft />
            Back
          </button>

          <button
            type="button"
            onClick={refresh}
            disabled={!canSearch}
            className="px-3 py-2 rounded-lg bg-primary-800 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
        </div>

        <h1 className="text-2xl font-bold mt-4">Eat</h1>
        <p className="text-gray-300 mt-1">
          Restaurants near you (live location). No default list.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FiSearch />
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food (e.g., biryani, dosa, cafe)"
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-secondary border border-primary-800 focus:outline-none focus:border-primary-600"
            />
          </div>

          <button
            type="button"
            onClick={fetchPlaces}
            disabled={!canSearch}
            className="px-5 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
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

        <div className="mt-6">
          {loadingPlaces && <div className="text-gray-300">Loading nearby restaurants…</div>}

          {!loadingPlaces && location && derived.length === 0 && !placesError && (
            <div className="text-gray-300">No restaurants found nearby. Try searching "cafe".</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {derived.map(({ place, distanceKm }) => (
              <div
                key={place.id}
                className="bg-secondary border border-primary-800 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-lg">{place.name}</div>
                    <div className="text-gray-400 text-sm mt-1">{place.address || ' '}</div>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-nowrap">{distanceKm} km</div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-300">
                  <div className="inline-flex items-center gap-1">
                    <FiStar />
                    {place.tags?.['rating'] ?? '—'}
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <FiMapPin />
                    restaurant
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onDirections(place)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-700"
                  >
                    <FiNavigation />
                    Directions
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/bus?name=${encodeURIComponent(place.name)}&dLat=${place.lat}&dLng=${place.lng}`)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-black font-semibold"
                  >
                    Bus Guidance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantsPage;
