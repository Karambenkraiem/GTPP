import { useEffect, useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';
import QRCode from './QRCode';

const APK_PATH = import.meta.env.VITE_APK_URL || '/downloads/gtpp.apk';
const SEEN_KEY = 'gtpp_qr_popup_seen';

function isMobileBrowser() {
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(window.navigator.userAgent);
  return isMobileUA && !Capacitor.isNativePlatform();
}

export default function AppDownloadQR() {
  const isNativeApp = Capacitor.isNativePlatform();
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (isMobileBrowser() || isNativeApp || localStorage.getItem(SEEN_KEY)) return;
    setPopupOpen(true);
  }, [isNativeApp]);

  const closePopup = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setPopupOpen(false);
  };

  if (isMobileBrowser()) return null;

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
            {isNativeApp ? 'Mettre à jour l\'application' : 'Application mobile'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isNativeApp
              ? "Téléchargez la dernière version pour mettre à jour l'application GTpp."
              : "Scannez ce code avec votre téléphone pour télécharger et installer l'application GTpp (APK Android)."}
          </p>
          {isNativeApp && (
            <a
              href={apkUrl}
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Download size={12} />
              Télécharger l'APK
            </a>
          )}
        </div>
      </div>
    </>
  );
}
