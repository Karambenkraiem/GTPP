import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import Modal from './Modal';
import QRCode from './QRCode';

const APK_PATH = import.meta.env.VITE_APK_URL || '/downloads/gtpp.apk';
const SEEN_KEY = 'gtpp_qr_popup_seen';

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(window.navigator.userAgent);
}

export default function AppDownloadQR() {
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (isMobileDevice() || localStorage.getItem(SEEN_KEY)) return;
    setPopupOpen(true);
  }, []);

  const closePopup = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setPopupOpen(false);
  };

  if (isMobileDevice()) return null;

  const apkUrl = APK_PATH.startsWith('http') ? APK_PATH : `${window.location.origin}${APK_PATH}`;

  return (
    <>
      <Modal open={popupOpen} onClose={closePopup} title="Application mobile GTpp" size="sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-white rounded-lg p-3">
            <QRCode value={apkUrl} size={160} />
          </div>
          <div>
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
              <Smartphone size={15} className="text-amber-400" />
              Installez l'application sur votre téléphone
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Scannez ce code avec votre téléphone pour télécharger et installer l'application GTpp (APK Android).
            </p>
          </div>
        </div>
      </Modal>

      <div className="w-full max-w-xs mt-6 bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
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
    </>
  );
}
