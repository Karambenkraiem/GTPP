import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Download, X } from 'lucide-react';

const VERSION_PATH = import.meta.env.VITE_APK_VERSION_URL || '/downloads/version.json';
const APK_PATH = import.meta.env.VITE_APK_URL || '/downloads/gtpp.apk';
const DISMISS_KEY = 'gtpp_update_dismissed_version';

function toAbsolute(path: string) {
  return path.startsWith('http') ? path : `${window.location.origin}${path}`;
}

export default function UpdateBanner() {
  const [remoteCode, setRemoteCode] = useState<number | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    (async () => {
      try {
        const info = await CapacitorApp.getInfo();
        const installedCode = parseInt(info.build, 10);

        const res = await fetch(toAbsolute(VERSION_PATH), { cache: 'no-store' });
        if (!res.ok) return;
        const remote = await res.json();
        const code = Number(remote.versionCode);
        if (!Number.isFinite(installedCode) || !Number.isFinite(code) || code <= installedCode) return;

        if (localStorage.getItem(DISMISS_KEY) === String(code)) return;
        setRemoteCode(code);
      } catch {
        // vérification best-effort : on ignore silencieusement les échecs réseau
      }
    })();
  }, []);

  if (remoteCode === null) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(remoteCode));
    setRemoteCode(null);
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-xl border border-amber-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-lg flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
        <Download size={17} />
      </div>
      <div className="flex-1 text-sm">
        <div className="font-semibold text-slate-100">Nouvelle version disponible</div>
        <p className="mt-0.5 text-slate-400">Une mise à jour de GTpp est prête à être installée.</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <a
          href={toAbsolute(APK_PATH)}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
        >
          Télécharger
        </a>
        <button onClick={dismiss} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
