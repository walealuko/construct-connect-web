'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 w-12 h-12 p-0 rounded-full shadow-2xl z-50 bg-blue-600 text-white hover:bg-blue-700 transition-all"
    >
      <span className="text-xl">↑</span>
    </Button>
  );
};
