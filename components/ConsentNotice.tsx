'use client';

import { useEffect, useState } from 'react';

export default function ConsentNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = window.localStorage.getItem('fluffys-analytics-choice');
    if (!choice) setVisible(true);
  }, []);

  function choose(value: 'granted' | 'denied') {
    window.localStorage.setItem('fluffys-analytics-choice', value);
    document.cookie = `fluffys_analytics=${value}; Path=/; SameSite=Lax; Max-Age=15552000`;
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="consent-banner" role="dialog" aria-label="Analytics consent">
      <p>Allow anonymous visit counts to be sent to Google Analytics if it is configured. Menu and phone clicks stay on this website either way.</p>
      <div className="admin-actions">
        <button className="button primary" type="button" onClick={() => choose('granted')}>
          Allow analytics
        </button>
        <button className="button secondary" type="button" onClick={() => choose('denied')}>
          Decline
        </button>
      </div>
    </div>
  );
}
