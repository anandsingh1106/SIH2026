import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../services/auth/authContext';
import { AuthStackNavigator } from './AuthStackNavigator';
import { AshaStackNavigator } from './AshaStackNavigator';
import { PatientStackNavigator } from './PatientStackNavigator';

/**
 * Reproduces the exact state machine in frontend/src/App.tsx's
 * ProtectedRoute: loading, then a signed-in user with an outstanding second
 * factor (routed to the auth stack, which owns the 2FA screens), then an
 * unauthenticated visitor, then the two role stacks this app supports.
 *
 * Unlike web, which has five roles behind ProtectedRoute's allowedRoles
 * prop, mobile only ever authenticates ASHA and Patient accounts — there is
 * no equivalent screen tree for doctor/specialist/admin to route to.
 */
export function RootNavigator() {
  const { isLoading, currentUser, mfaAction, isAuthenticated, currentRole } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  // A signed-in user with an outstanding second factor is not authenticated,
  // but isn't anonymous either — same case web routes to /setup-2fa or
  // /verify-2fa instead of bouncing to /login.
  if (currentUser && mfaAction !== 'none') {
    return <AuthStackNavigator />;
  }

  if (!isAuthenticated) {
    return <AuthStackNavigator />;
  }

  if (currentRole === 'asha') {
    return <AshaStackNavigator />;
  }

  if (currentRole === 'patient') {
    return <PatientStackNavigator />;
  }

  // A doctor/specialist/admin account signed into the mobile app: those
  // roles have no screens here. Rather than render a stack that doesn't
  // exist, say so plainly and point back to the web app.
  return (
    <View style={styles.loading}>
      <Text style={styles.unsupportedText}>
        This account's role does not have a mobile app yet. Please use the web portal.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F6', padding: 24 },
  unsupportedText: { fontSize: 14, color: '#374151', textAlign: 'center' },
});
