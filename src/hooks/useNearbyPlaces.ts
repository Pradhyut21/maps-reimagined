import { useState, useEffect } from 'react';
import { Location, Place, getNearbyPlaces } from '../utils/googleMaps';
import { useGeolocation } from './useGeolocation';

export const useNearbyPlaces = (type: string, keyword?: string) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, error: locationError, loading: locationLoading, getCurrentLocation } = useGeolocation();

  const fetchNearbyPlaces = async () => {
    if (!location) {
      setError('Location not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nearbyPlaces = await getNearbyPlaces(location, type, 5000, keyword);
      setPlaces(nearbyPlaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby places');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchNearbyPlaces();
    }
  }, [location, type, keyword]);

  const refreshPlaces = () => {
    if (!location) {
      getCurrentLocation();
    } else {
      fetchNearbyPlaces();
    }
  };

  return {
    places,
    loading: loading || locationLoading,
    error: error || locationError,
    refreshPlaces,
    getCurrentLocation,
    hasLocation: !!location,
  };
};
