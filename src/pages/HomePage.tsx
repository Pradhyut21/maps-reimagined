import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMap, FiCoffee, FiNavigation, FiAlertTriangle, FiSearch, FiMapPin, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useRecoilValue } from 'recoil';
import { recentSearchesState, savedPlacesState } from '../state/places';

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  const recentSearches = useRecoilValue(recentSearchesState);
  const savedPlaces = useRecoilValue(savedPlacesState);

  // Update time and greeting every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Set greeting based on time of day
      const hours = now.getHours();
      if (hours < 12) {
        setGreeting('Good morning');
      } else if (hours < 18) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    }, 60000);

    // Initial greeting
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting('Good morning');
    } else if (hours < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    return () => clearInterval(timer);
  }, []);

  // Format time to HH:MM AM/PM
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="relative min-h-screen p-4 pb-20 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          className="absolute inset-0 w-full h-full object-cover waves-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/sunset-waves.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 waves-fallback kenburns-bg"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=80&v=2')",
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10">
        {/* Header with greeting and time */}
        <header className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-white">{greeting}, User</h1>
            <div className="flex items-center bg-primary-800 text-white px-3 py-1 rounded-full">
              <FiClock className="mr-2" />
              <span>{formattedTime}</span>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search for places, restaurants, or landmarks..."
              className="w-full bg-primary-800 text-white placeholder-gray-400 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </header>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <Link to="/map" className="flex flex-col items-center justify-center bg-primary-800 p-4 rounded-xl hover:bg-primary-700 transition-colors">
            <div className="bg-accent-500/20 p-3 rounded-full mb-2">
              <FiMap className="text-accent-500 text-xl" />
            </div>
            <span className="text-sm text-center">Explore Map</span>
          </Link>
          <Link to="/restaurants" className="flex flex-col items-center justify-center bg-primary-800 p-4 rounded-xl hover:bg-primary-700 transition-colors">
            <div className="bg-accent-500/20 p-3 rounded-full mb-2">
              <FiCoffee className="text-accent-500 text-xl" />
            </div>
            <span className="text-sm text-center">Eat & Drink</span>
          </Link>
          <Link to="/transport" className="flex flex-col items-center justify-center bg-primary-800 p-4 rounded-xl hover:bg-primary-700 transition-colors">
            <div className="bg-accent-500/20 p-3 rounded-full mb-2">
              <FiNavigation className="text-accent-500 text-xl" />
            </div>
            <span className="text-sm text-center">Transport</span>
          </Link>
          <Link to="/emergency" className="flex flex-col items-center justify-center bg-red-600/20 p-4 rounded-xl hover:bg-red-600/30 transition-colors">
            <div className="bg-red-500/20 p-3 rounded-full mb-2">
              <FiAlertTriangle className="text-red-500 text-xl" />
            </div>
            <span className="text-sm text-center">Emergency</span>
          </Link>
        </div>
      </section>

      {/* Saved Places */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Saved Places</h2>
        </div>
        {savedPlaces.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No saved places yet. Open Map and tap “Save for Later”.
          </div>
        ) : (
          <div className="space-y-3">
            {savedPlaces.map((place) => (
              <motion.div
                key={place.id}
                whileTap={{ scale: 0.98 }}
                className="flex items-center bg-primary-800 p-3 rounded-xl"
              >
                <div className="bg-accent-500/20 p-2 rounded-lg mr-3">
                  <FiMapPin className="text-accent-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{place.name}</h3>
                  <p className="text-xs text-gray-400">{place.type}</p>
                </div>
                <Link to="/map" className="text-gray-400 hover:text-white">
                  <FiNavigation className="transform rotate-45" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Searches */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Searches</h2>
        </div>
        {recentSearches.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No recent searches yet. Search something in the Map page.
          </div>
        ) : (
          <div className="space-y-3">
            {recentSearches.map((s) => (
              <motion.div
                key={s.id}
                whileTap={{ scale: 0.98 }}
                className="flex items-center bg-primary-800 p-3 rounded-xl"
              >
                <div className="bg-accent-500/20 p-2 rounded-lg mr-3">
                  <FiSearch className="text-accent-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{s.query}</h3>
                  <p className="text-xs text-gray-400">Searched recently</p>
                </div>
                <Link to="/map" className="text-gray-400 hover:text-white">
                  <FiNavigation className="transform rotate-45" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default HomePage;
