import { useState, useEffect, useCallback } from 'react';
import { getNearbyPlaces, calculateDistance, Location, Place } from '../utils/googleMaps';

type PlaceType = 'hospital' | 'police' | 'pharmacy';

interface UseEmergencyLocationsProps {
  initialLocation?: Location | null;
  radius?: number;
}

export const useEmergencyLocations = ({ 
  initialLocation = null, 
  radius = 5000 
} = {}) => {
  const [location, setLocation] = useState<Location | null>(initialLocation);
  const [places, setPlaces] = useState<Record<PlaceType, Place[]>>({
    hospital: [],
    police: [],
    pharmacy: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Get user's current location
  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          resolve(newLocation);
        },
        (err) => {
          const errorMessage = `Unable to retrieve your location: ${err.message}`;
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }, []);

  // Load nearby places of a specific type
  const loadNearbyPlaces = useCallback(async (type: PlaceType) => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await getNearbyPlaces(location, type, radius);
      setPlaces(prev => ({
        ...prev,
        [type]: results
      }));
    } catch (err) {
      console.error(`Error loading ${type} locations:`, err);
      setError(`Failed to load ${type} locations. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [location, radius]);

  // Load all emergency locations
  const loadAllEmergencyLocations = useCallback(async () => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [hospitals, policeStations] = await Promise.all([
        getNearbyPlaces(location, 'hospital', radius),
        getNearbyPlaces(location, 'police', radius)
      ]);
      
      setPlaces({
        hospital: hospitals,
        police: policeStations,
        pharmacy: [] // Will be loaded when needed
      });
    } catch (err) {
      console.error('Error loading emergency locations:', err);
      setError('Failed to load emergency locations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [location, radius]);

  // Get distance to a place from current location
  const getDistanceToPlace = useCallback((place: Place): string => {
    if (!location) return 'N/A';
    return calculateDistance(
      location.lat,
      location.lng,
      place.geometry.location.lat,
      place.geometry.location.lng
    );
  }, [location]);

  // Initialize with current location
  useEffect(() => {
    if (!location) {
      getCurrentLocation().catch(console.error);
    }
  }, [getCurrentLocation, location]);

  // Load initial data when location changes
  useEffect(() => {
    if (location) {
      loadAllEmergencyLocations();
    }
  }, [location, loadAllEmergencyLocations]);

  return {
    location,
    places,
    isLoading,
    error,
    selectedPlace,
    setSelectedPlace,
    getCurrentLocation,
    loadNearbyPlaces,
    loadAllEmergencyLocations,
    getDistanceToPlace,
    refreshLocations: async () => {
      if (location) {
        await loadAllEmergencyLocations();
      } else {
        await getCurrentLocation();
      }
    }
  };
};
