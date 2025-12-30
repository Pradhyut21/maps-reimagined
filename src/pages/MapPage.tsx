import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiSearch, FiNavigation, FiInfo, FiStar, FiClock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetRecoilState } from 'recoil';
import { recentSearchesState, savedPlacesState } from '../state/places';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

// Fix for default marker icons in React Leaflet
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom hook to handle map events
const MapEvents = ({ onMoveEnd }: { onMoveEnd: (lat: number, lng: number) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    },
  });
  return null;
};

// Component to handle map view changes
const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

const RouteOverlay = ({
  route,
  origin,
  destination,
}: {
  route: [number, number][] | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!origin || !destination) return;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      try {
        const bounds = L.latLngBounds([origin, destination]);
        // Avoid animation-related crashes when map is transitioning/unmounting.
        map.fitBounds(bounds.pad(0.3), { animate: false });
      } catch {
        // ignore
      }
    };

    // Ensure map panes are ready before fitting bounds.
    if ((map as any)._loaded) {
      run();
    } else {
      map.whenReady(run);
    }

    return () => {
      cancelled = true;
    };
  }, [map, origin, destination]);

  return (
    <>
      {origin && (
        <Marker position={origin}>
          <Popup>Start</Popup>
        </Marker>
      )}
      {destination && (
        <Marker position={destination}>
          <Popup>Destination</Popup>
        </Marker>
      )}
      {route && (
        <Polyline positions={route} pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.9 }} />
      )}
    </>
  );
};

// Sample data for places
const places = [
  {
    id: 1,
    name: 'Central Park',
    type: 'Park',
    position: [51.505, -0.09] as [number, number],
    rating: 4.7,
    description: 'A beautiful park in the heart of the city with walking trails and scenic views.',
    image: 'https://source.unsplash.com/random/300x200?park',
    category: 'attraction',
  },
  {
    id: 2,
    name: 'Downtown Cafe',
    type: 'Cafe',
    position: [51.51, -0.1] as [number, number],
    rating: 4.5,
    description: 'Cozy cafe serving artisanal coffee and fresh pastries.',
    image: 'https://source.unsplash.com/random/300x200?cafe',
    category: 'food',
  },
  {
    id: 3,
    name: 'City Museum',
    type: 'Museum',
    position: [51.5, -0.08] as [number, number],
    rating: 4.8,
    description: 'Explore the rich history and culture of our city through fascinating exhibits.',
    image: 'https://source.unsplash.com/random/300x200?museum',
    category: 'attraction',
  },
  {
    id: 4,
    name: 'Riverside Walk',
    type: 'Scenic Walk',
    position: [51.495, -0.11] as [number, number],
    rating: 4.6,
    description: 'Picturesque walking path along the river with beautiful views.',
    image: 'https://source.unsplash.com/random/300x200?river',
    category: 'attraction',
  },
  {
    id: 5,
    name: 'Local Bistro',
    type: 'Restaurant',
    position: [51.515, -0.07] as [number, number],
    rating: 4.4,
    description: 'Modern bistro offering locally-sourced ingredients and seasonal dishes.',
    image: 'https://source.unsplash.com/random/300x200?restaurant',
    category: 'food',
  },
];

const MapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<typeof places[0] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [mapZoom, setMapZoom] = useState(13);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    attractions: true,
    food: true,
    shopping: true,
    services: true,
  });

  const mapRef = useRef<L.Map | null>(null);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string; lat: number; lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<{ label: string; lat: number; lng: number } | null>(null);

  const setRecentSearches = useSetRecoilState(recentSearchesState);
  const setSavedPlaces = useSetRecoilState(savedPlacesState);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      // Check if it's the first visit
      const hasSeenNamaste = localStorage.getItem('hasSeenNamaste');
      if (!hasSeenNamaste) {
        toast('🙏 Namaste from India — please allow location');
        localStorage.setItem('hasSeenNamaste', 'true');
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // In-app directions: /map?oLat=..&oLng=..&dLat=..&dLng=..
  useEffect(() => {
    const readNum = (k: string) => {
      const raw = searchParams.get(k);
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const oLat = readNum('oLat');
    const oLng = readNum('oLng');
    const dLat = readNum('dLat');
    const dLng = readNum('dLng');

    const inRange = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    const hasRoute =
      oLat != null && oLng != null && dLat != null && dLng != null && inRange(oLat, oLng) && inRange(dLat, dLng);
    if (!hasRoute) {
      setOrigin(null);
      setDestination(null);
      setRoute(null);
      setRouteError(null);
      return;
    }

    if (oLat === dLat && oLng === dLng) {
      setOrigin([oLat, oLng]);
      setDestination([dLat, dLng]);
      setRoute(null);
      setRouteError('Origin and destination are the same');
      return;
    }

    const o: [number, number] = [oLat, oLng];
    const d: [number, number] = [dLat, dLng];
    setOrigin(o);
    setDestination(d);
    setRouteError(null);

    // Center roughly between points while OSRM fetch runs.
    setMapCenter([(oLat + dLat) / 2, (oLng + dLng) / 2]);
    setMapZoom(13);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coords)) throw new Error('No route found');
        // OSRM returns [lng,lat]
        const latLngs: [number, number][] = coords
          .filter((c: any) => Array.isArray(c) && c.length >= 2)
          .map((c: any) => [c[1], c[0]]);
        setRoute(latLngs);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setRouteError('Route request timed out');
        } else {
          setRouteError(e instanceof Error ? e.message : 'Failed to fetch route');
        }
        setRoute(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchParams]);

  // Handle search
  const pushRecentSearch = (q: string) => {
    setRecentSearches((prev) => {
      const next = [{ id: `${Date.now()}`, query: q, createdAt: Date.now() }, ...prev];
      const seen = new Set<string>();
      const deduped = next.filter((item) => {
        const key = item.query.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped.slice(0, 10);
    });
  };

  const selectSuggestion = (s: { label: string; lat: number; lng: number }) => {
    setSearchQuery(s.label);
    setMapCenter([s.lat, s.lng]);
    setMapZoom(15);
    setShowSuggestions(false);
    setSearchedPlace({ label: s.label, lat: s.lat, lng: s.lng });
    pushRecentSearch(s.label);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }

    pushRecentSearch(q);
    setShowSuggestions(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data.length) return;
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setMapCenter([lat, lng]);
      setMapZoom(15);
      setSearchQuery(data[0].display_name);
      setSearchedPlace({ label: data[0].display_name, lat, lng });
    } finally {
      clearTimeout(timeoutId);
      controller.abort();
    }
  };

  const onDirectionsToSearched = () => {
    if (!searchedPlace || !userLocation) return;
    setSearchParams({
      oLat: String(userLocation[0]),
      oLng: String(userLocation[1]),
      dLat: String(searchedPlace.lat),
      dLng: String(searchedPlace.lng),
    });
  };

  const onSaveSearched = () => {
    if (!searchedPlace) return;
    setSavedPlaces((prev) => {
      const id = `search:${searchedPlace.lat.toFixed(5)},${searchedPlace.lng.toFixed(5)}`;
      const next = [
        {
          id,
          name: searchedPlace.label,
          type: 'Search',
          createdAt: Date.now(),
        },
        ...prev.filter((p) => p.id !== id),
      ];
      return next.slice(0, 25);
    });
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ place_id: number; lat: string; lon: string; display_name: string }>;
        const mapped = data
          .map((d) => ({
            id: String(d.place_id),
            label: d.display_name,
            lat: Number(d.lat),
            lng: Number(d.lon),
          }))
          .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
        setSuggestions(mapped);
      } catch {
        // ignore
      } finally {
        clearTimeout(timeoutId);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSaveForLater = () => {
    if (!selectedPlace) return;

    setSavedPlaces((prev) => {
      const id = `${selectedPlace.id}`;
      const next = [
        {
          id,
          name: selectedPlace.name,
          type: selectedPlace.type,
          createdAt: Date.now(),
        },
        ...prev.filter((p) => p.id !== id),
      ];
      return next.slice(0, 25);
    });
  };

  // Handle map move end
  const handleMoveEnd = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    // In a real app, you would fetch nearby places here
  };

  // Filter places based on active filters
  const filteredPlaces = places.filter((place) => {
    if (place.category === 'attraction' && !filters.attractions) return false;
    if (place.category === 'food' && !filters.food) return false;
    if (place.category === 'shopping' && !filters.shopping) return false;
    if (place.category === 'services' && !filters.services) return false;
    return true;
  });

  // Center map on user's location
  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(15);
    }
  };

  return (
    <div className="h-screen w-full relative">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <form 
              onSubmit={handleSearch}
              className="bg-white bg-opacity-90 rounded-lg shadow-lg overflow-hidden flex items-center"
            >
              <button type="submit" className="px-3 text-gray-500">
                <FiSearch />
              </button>
              <input
                type="text"
                placeholder="Search for places..."
                className="flex-1 py-3 pr-4 bg-transparent outline-none text-gray-800"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 120);
                }}
              />
            </form>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  {suggestions.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-800 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm">{s.label}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Filter Button */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-3 bg-white bg-opacity-90 rounded-lg shadow-lg text-gray-800"
            aria-label="Filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {searchedPlace && (
          <div className="mt-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-800 truncate">{searchedPlace.label}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveSearched}
                className="px-3 py-2 rounded-lg bg-secondary text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onDirectionsToSearched}
                disabled={!userLocation}
                className="px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Directions
              </button>
            </div>
          </div>
        )}
        
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-4"
            >
              <h3 className="font-medium text-gray-800 mb-3">Filter by Category</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(filters).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => setFilters(prev => ({
                        ...prev,
                        [key]: !prev[key as keyof typeof filters]
                      }))}
                      className="rounded text-accent-500 focus:ring-accent-500"
                    />
                    <span className="capitalize text-sm text-gray-700">
                      {key}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          ref={mapRef}
        >
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <MapEvents onMoveEnd={handleMoveEnd} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            className="map-tiles"
          />
          
          {/* User location marker */}
          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={new L.Icon({
                ...defaultIcon.options,
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}
          
          {searchedPlace && (
            <Marker
              position={[searchedPlace.lat, searchedPlace.lng]}
              icon={new L.Icon({
                ...defaultIcon.options,
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
              eventHandlers={{
                click: () => {
                  setSelectedPlace(null);
                },
              }}
            >
              <Popup>{searchedPlace.label}</Popup>
            </Marker>
          )}
          
          {/* Place markers */}
          {filteredPlaces.map((place) => (
            <Marker 
              key={place.id} 
              position={place.position} 
              icon={new L.Icon({
                ...defaultIcon.options,
                iconUrl: place.category === 'food' 
                  ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png' 
                  : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
              eventHandlers={{
                click: () => {
                  setSelectedPlace(place);
                },
              }}
            >
              <Popup>
                <div className="w-40">
                  <h3 className="font-semibold">{place.name}</h3>
                  <p className="text-sm text-gray-600">{place.type}</p>
                  <div className="flex items-center mt-1">
                    <FiStar className="text-yellow-400 mr-1" size={12} />
                    <span className="text-sm">{place.rating}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          <RouteOverlay route={route} origin={origin} destination={destination} />
        </MapContainer>
      </div>

      {routeError && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {routeError}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <form 
              onSubmit={handleSearch}
              className="bg-white bg-opacity-90 rounded-lg shadow-lg overflow-hidden flex items-center"
            >
              <button type="submit" className="px-3 text-gray-500">
                <FiSearch />
              </button>
              <input
                type="text"
                placeholder="Search for places..."
                className="flex-1 py-3 pr-4 bg-transparent outline-none text-gray-800"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 120);
                }}
              />
            </form>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  {suggestions.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-800 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm">{s.label}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Filter Button */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-3 bg-white bg-opacity-90 rounded-lg shadow-lg text-gray-800"
            aria-label="Filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {searchedPlace && (
          <div className="mt-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-800 truncate">{searchedPlace.label}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveSearched}
                className="px-3 py-2 rounded-lg bg-secondary text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onDirectionsToSearched}
                disabled={!userLocation}
                className="px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Directions
              </button>
            </div>
          </div>
        )}
        
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-4"
            >
              <h3 className="font-medium text-gray-800 mb-3">Filter by Category</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(filters).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => setFilters(prev => ({
                        ...prev,
                        [key]: !prev[key as keyof typeof filters]
                      }))}
                      className="rounded text-accent-500 focus:ring-accent-500"
                    />
                    <span className="capitalize text-sm text-gray-700">
                      {key}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Sheet for Selected Place */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 p-6 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPlace.name}</h2>
                <p className="text-gray-600">{selectedPlace.type}</p>
              </div>
              <button 
                onClick={() => setSelectedPlace(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative h-48 bg-gray-200 rounded-xl mb-4 overflow-hidden">
              <img 
                src={selectedPlace.image} 
                alt={selectedPlace.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                <FiStar className="text-yellow-400 mr-1" />
                <span>{selectedPlace.rating}</span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">{selectedPlace.description}</p>
            
            <div className="space-y-3">
              <button className="w-full bg-accent-500 hover:bg-accent-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <FiNavigation className="mr-2" />
                Get Directions
              </button>
              
              <button className="w-full border border-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <FiInfo className="mr-2" />
                More Information
              </button>
              
              <button
                type="button"
                onClick={handleSaveForLater}
                className="w-full border border-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium flex items-center justify-center"
              >
                <FiClock className="mr-2" />
                Save for Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-24 right-4 z-10 space-y-3">
        <button 
          onClick={centerOnUser}
          className="bg-white p-3 rounded-full shadow-lg text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Center on my location"
        >
          <FiNavigation />
        </button>
        
        <button 
          onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
          className="bg-white p-3 rounded-t-full shadow-lg text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        
        <button 
          onClick={() => setMapZoom(prev => Math.max(prev - 1, 3))}
          className="bg-white p-3 rounded-b-full shadow-lg text-gray-800 hover:bg-gray-100 transition-colors -mt-px"
          aria-label="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MapPage;
