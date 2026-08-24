import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { EventsAPI } from '../services/api';

const NotificationContext = createContext();

// Web Audio API Synthesizer for instant alert chimes
const playAlertSound = (severity = 'MEDIUM') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      // High alert 2-tone pleasant chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.5);
    } else {
      // Gentle soft chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    // Silent fail if audio context blocked before user interaction
  }
};

export function NotificationProvider({ children, onSelectEvent }) {
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopPermitted, setDesktopPermitted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const seenEventIdsRef = useRef(new Set());
  const toastTimeoutRef = useRef(null);

  // Request native browser desktop push notifications
  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setDesktopPermitted(perm === 'granted');
    }
  };

  // Poll for newly detected events every 4 seconds
  useEffect(() => {
    let isMounted = true;

    const pollNewEvents = async () => {
      try {
        const res = await EventsAPI.list({ limit: 12 });
        const events = res.data || [];
        
        // On initial mount, seed seen IDs without firing noisy initial batch
        if (seenEventIdsRef.current.size === 0 && events.length > 0) {
          events.forEach((e) => seenEventIdsRef.current.add(e.event_id));
          const initialNotifs = events.map((e) => ({
            id: e.event_id,
            title: e.event_type.replace(/_/g, ' '),
            description: e.description || `Detected at ${e.location || 'Highway'}`,
            severity: e.severity || 'MEDIUM',
            timestamp: e.timestamp || '00:00',
            timeAgo: 'Recently',
            isRead: false,
            eventData: e,
          }));
          if (isMounted) setNotifications(initialNotifs);
          return;
        }

        // Identify any brand new events
        const newEvents = events.filter((e) => !seenEventIdsRef.current.has(e.event_id));
        if (newEvents.length > 0) {
          newEvents.forEach((e) => seenEventIdsRef.current.add(e.event_id));

          const newNotifs = newEvents.map((e) => ({
            id: e.event_id,
            title: e.event_type.replace(/_/g, ' '),
            description: e.description || `Detected at ${e.location || 'Highway'}`,
            severity: e.severity || 'MEDIUM',
            timestamp: e.timestamp || '00:00',
            timeAgo: 'Just now',
            isRead: false,
            eventData: e,
          }));

          if (isMounted) {
            setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50));
            
            // Trigger latest as active floating toast
            const latest = newNotifs[0];
            showToast(latest);

            // Play sound if enabled
            if (soundEnabled) {
              playAlertSound(latest.severity);
            }

            // Trigger Desktop Notification if permitted
            if (desktopPermitted && typeof window !== 'undefined' && 'Notification' in window) {
              new Notification(`[IBVAP Alert] ${latest.title}`, {
                body: `${latest.description} (${latest.severity})`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      } catch (err) {
        // Suppress noisy network offline errors when server is restarting
        if (err.response?.status !== 503 && err.code !== 'ERR_NETWORK') {
          console.debug('Polling deferred:', err.message);
        }
      }
    };

    pollNewEvents();
    const interval = setInterval(pollNewEvents, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [soundEnabled, desktopPermitted]);

  const showToast = (notif) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  };

  const dismissToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(null);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        showToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        clearAll,
        soundEnabled,
        setSoundEnabled,
        desktopPermitted,
        requestDesktopPermission,
        playAlertSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
