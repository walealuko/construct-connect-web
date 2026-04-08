// src/hooks/useUserLocation.jsx
import { useState, useEffect } from "react";

const useUserLocation = () => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocation(null); // fallback if user denies
        }
      );
    }
  }, []);

  return location;
};

export default useUserLocation;
