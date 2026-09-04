import NetInfo from '@react-native-community/netinfo';
import { ConnectivityAdapter } from '@arogyasetu/shared/services/offline';

/**
 * `isOnline()` on the shared queue is read synchronously in several places
 * (e.g. before enqueuing), so the latest NetInfo state is cached here and
 * refreshed by the subscription NetInfo already keeps running in the
 * background — the same pattern the web adapter uses for `navigator.onLine`.
 */
let lastKnownOnline = true;

NetInfo.fetch().then((state) => {
  lastKnownOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
});

export const rnConnectivityAdapter: ConnectivityAdapter = {
  isOnline() {
    return lastKnownOnline;
  },
  onChange(callback) {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      lastKnownOnline = online;
      callback(online);
    });
    return unsubscribe;
  },
};
