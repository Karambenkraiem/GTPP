import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const EXIT_WINDOW_MS = 2000;

export default function AndroidBackButton() {
  const navigate = useNavigate();
  const [showExitHint, setShowExitHint] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
        return;
      }

      if (armedRef.current) {
        CapacitorApp.exitApp();
        return;
      }

      armedRef.current = true;
      setShowExitHint(true);
      timerRef.current = setTimeout(() => {
        armedRef.current = false;
        setShowExitHint(false);
      }, EXIT_WINDOW_MS);
    });

    return () => {
      listenerPromise.then((l) => l.remove());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);

  if (!showExitHint) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-full shadow-lg">
      Appuyez de nouveau pour quitter
    </div>
  );
}
