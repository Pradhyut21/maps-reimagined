// Google Maps API utility functions

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
  };
  geometry: {
    location: Location;
  };
  types: string[];
}

// Replace with your actual Google Maps API key
const API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Get nearby places based on location and type
 */
export const getNearbyPlaces = async (
  location: Location, 
  type: string, 
  radius: number = 5000, // 5km default radius
  keyword?: string
): Promise<Place[]> => {
  try {
    let url = `${BASE_URL}/nearbysearch/json?`;
    url += `location=${location.lat},${location.lng}`;
    url += `&radius=${radius}`;
    url += `&type=${type}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    url += `&key=${API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results;
    } else {
      console.error('Google Places API Error:', data.status, data.error_message);
      throw new Error(data.error_message || 'Failed to fetch places');
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    console.error('Error fetching places:', error);
    throw error;
  }
};

/**
 * Calculate distance between two points in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1);
};

/**
 * Get directions URL
 */
export const getDirectionsUrl = (origin: Location, destination: Location): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
};

/**
 * Get place details
 */
export const getPlaceDetails = async (placeId: string): Promise<any> => {
  try {
    const response = await fetch(
      `${BASE_URL}/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,website,rating,user_ratings_total&key=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    } else {
      throw new Error(data.error_message || 'Failed to fetch place details');
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
};
