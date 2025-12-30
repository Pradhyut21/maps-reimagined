import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { FiHome, FiMap, FiCoffee, FiNavigation, FiTruck, FiMessageCircle, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  const navItems = [
    { path: '/', icon: <FiHome size={20} />, label: 'Home' },
    { path: '/map', icon: <FiMap size={20} />, label: 'Map' },
    { path: '/restaurants', icon: <FiCoffee size={20} />, label: 'Eat' },
    { path: '/transport', icon: <FiNavigation size={20} />, label: 'Go' },
    { path: '/bus', icon: <FiTruck size={20} />, label: 'Bus' },
    { path: '/assistant', icon: <FiMessageCircle size={20} />, label: 'AI' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary-950 text-white">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-primary-800 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.path)
                  ? 'text-yellow-300'
                  : 'text-yellow-400 hover:text-yellow-300'
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive(item.path) && (
                  <motion.span
                    className="absolute -bottom-1 left-1/2 w-1 h-1 bg-accent-500 rounded-full -translate-x-1/2"
                    layoutId="activeIndicator"
                  />
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          
          {/* Emergency Button */}
          <button
            onClick={() => setIsEmergencyOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full bg-black/70 text-red-500 hover:bg-black/80 hover:text-red-400 transition-colors"
          >
            <div className="relative">
              <FiAlertTriangle size={20} />
            </div>
            <span className="text-xs mt-1">Emergency</span>
          </button>
        </div>
      </nav>

      {/* Emergency Modal */}
      <AnimatePresence>
        {isEmergencyOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-secondary rounded-xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold mb-4 text-red-500">Emergency Assistance</h2>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    window.location.href = 'tel:112';
                  }}
                  className="w-full bg-red-900 hover:bg-red-800 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle /> Call Emergency Services
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmergencyOpen(false);
                    navigate('/emergency');
                  }}
                  className="w-full bg-primary-700 hover:bg-primary-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <FiMap /> Show Nearby Hospitals & Police
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                          enableHighAccuracy: false,
                          timeout: 8000,
                          maximumAge: 60_000,
                        });
                      });

                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      const text = `My location: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

                      if (navigator.share) {
                        await navigator.share({ title: 'My Location', text });
                      } else {
                        await navigator.clipboard.writeText(text);
                      }
                    } finally {
                      setIsEmergencyOpen(false);
                    }
                  }}
                  className="w-full bg-primary-700 hover:bg-primary-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <FiNavigation /> Share My Location
                </button>
                <button 
                  onClick={() => setIsEmergencyOpen(false)}
                  className="w-full bg-transparent hover:bg-primary-800 text-gray-300 py-2 px-4 rounded-lg font-medium mt-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
