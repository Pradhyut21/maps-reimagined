import { useCallback, useState } from 'react';
import type { Location } from '../utils/googleMaps';

export const useGeolocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location position unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        // Faster first fix: don't force GPS, allow cached location.
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000,
      }
    );
  }, []);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
  };
};
