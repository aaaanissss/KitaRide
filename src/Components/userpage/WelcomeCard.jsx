import React, { useState, useEffect } from 'react';
import './WelcomeCard.css';

const WelcomeCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user) {
      // Get the current login timestamp (set during login)
      const currentLoginTime = localStorage.getItem('kitaRideCurrentLogin');
      const lastWelcomeShown = localStorage.getItem('kitaRideLastWelcomeShown');
      
      // Show welcome if either:
      // 1. No welcome has been shown before, OR
      // 2. The user logged in after the last welcome was shown (new login)
      const shouldShowWelcome = !lastWelcomeShown || 
                             (currentLoginTime && lastWelcomeShown < currentLoginTime);
      
      if (shouldShowWelcome) {
        // Small delay to allow page to load
        const timer = setTimeout(() => {
          setIsVisible(true);
          setIsAnimating(true);
          // Mark welcome as shown for this login
          localStorage.setItem('kitaRideLastWelcomeShown', Date.now().toString());
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const storedUser = localStorage.getItem('authUser');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!isVisible || !user) {
    return null;
  }

  const getSubtitle = () => {
    if (user.role === 'admin') {
      return {
        lines: ['Manage users, review attractions, and monitor data quality.'],
        tip: '',
      };
    }
    return {
      lines: ['Explore stations, discover nearby attractions, and understand ridership trends in Klang Valley.'],
      tip: 'Tip: Click any station on the map to see nearby places.',
    };
  };

  const subtitle = getSubtitle();

  return (
    <div className={`welcome-card-overlay ${isAnimating ? 'welcome-card--visible' : ''}`}>
      <div className="welcome-card">
        <button 
          className="welcome-card__close" 
          onClick={handleClose}
          aria-label="Close welcome message"
        >
          ×
        </button>
        
        <div className="welcome-card__content">
          <div className="welcome-card__badge">New to KitaRide</div>
          <div className="welcome-card__emoji" aria-hidden>🚌</div>
          <h2 className="welcome-card__title">Welcome to KitaRide</h2>
          <div className="welcome-card__subtitle">
            {subtitle.lines.map((line, index) => (
              <p key={index} className="welcome-card__subtitle-line">
                <em>{line}</em>
              </p>
            ))}
            {subtitle.tip && (
              <p className="welcome-card__subtitle-tip">
                <strong>{subtitle.tip}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
