import { useRef, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type UseIdleActivityOptions = {
  idleModalMs?: number;
  redirectMs?: number;
  /** When false, idle checking is suspended (e.g. while a print/crop job is in flight). Defaults to true. */
  enabled?: boolean;
};

/**
 * Shows an "idle" modal after inactivity, then fires a callback if the user
 * remains idle for an additional period.
 *
 * Defaults: 45 s until modal, 20 s after modal until callback.
 */
const useIdleActivity = (
  callback: () => void,
  { idleModalMs = 45_000, redirectMs = 20_000, enabled = true }: UseIdleActivityOptions = {},
) => {
  const [showModal, setShowModal] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const modalShownRef = useRef(false);
  const lastActivityTime = useRef(Date.now());
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const resetIdleTimer = useCallback(() => {
    lastActivityTime.current = Date.now();
    modalShownRef.current = false;
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    setShowModal(false);
  }, []);

  // expo-router keeps screens further back in the stack mounted after a
  // push, so without this every screen a customer has already passed
  // through keeps ticking its own idle countdown in the background and can
  // fire its redirect out from under whatever screen is actually focused.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      resetIdleTimer();
      return () => setIsFocused(false);
    }, [resetIdleTimer]),
  );

  // Listen for app foreground to reset idle timer
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          resetIdleTimer();
        }
      },
    );
    return () => subscription.remove();
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!enabled || !isFocused) {
      // Suspended (e.g. a print/crop job is in flight, or this screen is
      // blurred behind a later one in the stack) — don't let a stale
      // countdown pop the modal or fire the callback while we're paused.
      resetIdleTimer();
      return;
    }

    const checkIdleTime = () => {
      const idleTime = Date.now() - lastActivityTime.current;

      if (!modalShownRef.current && idleTime >= idleModalMs) {
        modalShownRef.current = true;
        setShowModal(true);
        redirectTimeoutRef.current = setTimeout(() => {
          callbackRef.current();
        }, redirectMs);
      }
    };

    const interval = setInterval(checkIdleTime, 1_000);
    return () => {
      clearInterval(interval);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [idleModalMs, redirectMs, enabled, isFocused, resetIdleTimer]);

  return { showModal, resetIdleTimer };
};

export default useIdleActivity;
