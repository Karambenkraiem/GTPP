import { Smartphone } from 'lucide-react';
import QRCode from './QRCode';

const APK_PATH = import.meta.env.VITE_APK_URL || '/downloads/gtpp.apk';

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(window.navigator.userAgent);
}

export default function AppDownloadQR() {
  if (isMobileDevice()) return null;

  const apkUrl = APK_PATH.startsWith('http') ? APK_PATH : `${window.location.origin}${APK_PATH}`;

  return (
    <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
      <div className="bg-white rounded-lg p-2 flex-shrink-0">
        <QRCode value={apkUrl} size={96} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Smartphone size={15} className="text-amber-400" />
          Application mobile
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Scannez ce code avec votre téléphone pour télécharger et installer l'application GTpp (APK Android).
        </p>
      </div>
    </div>
  );
}
