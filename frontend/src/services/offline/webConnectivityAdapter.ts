import { ConnectivityAdapter } from '@arogyasetu/shared/services/offline';

/** Backs connectivity detection with the browser's online/offline events. */
export const webConnectivityAdapter: ConnectivityAdapter = {
  isOnline() {
    return navigator.onLine;
  },
  onChange(callback) {
    const onOnline = () => callback(true);
    const onOffline = () => callback(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },
};
