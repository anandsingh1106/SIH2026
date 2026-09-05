import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert, Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '../services/auth/authContext';
import type { PatientStackParamList } from './types';
import { DashboardScreen } from '../screens/patient/DashboardScreen';
import { TimelineScreen } from '../screens/patient/TimelineScreen';
import { PrescriptionsScreen } from '../screens/patient/PrescriptionsScreen';
import { AppointmentsScreen } from '../screens/patient/AppointmentsScreen';
import { LabReportsScreen } from '../screens/patient/LabReportsScreen';
import { ReferralStatusScreen } from '../screens/patient/ReferralStatusScreen';
import { VaccinationsScreen } from '../screens/patient/VaccinationsScreen';
import { MedicineOrdersScreen } from '../screens/patient/MedicineOrdersScreen';
import { AudioPrescriptionScreen } from '../screens/patient/AudioPrescriptionScreen';
import { EmergencyScreen } from '../screens/patient/EmergencyScreen';
import { FamilyMembersScreen } from '../screens/patient/FamilyMembersScreen';

const Stack = createNativeStackNavigator<PatientStackParamList>();

/** Patient role screens, matching frontend/src/App.tsx's /patient/* route tree. */
function LogoutButton() {
  const { logout } = useAuth();
  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };
  return (
    <Pressable onPress={confirmLogout} hitSlop={8}>
      <Text style={headerStyles.logoutText}>Logout</Text>
    </Pressable>
  );
}

const headerStyles = StyleSheet.create({
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
});

export function PatientStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="PatientDashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Timeline" component={TimelineScreen} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="LabReports" component={LabReportsScreen} options={{ title: 'Lab Reports' }} />
      <Stack.Screen name="ReferralStatus" component={ReferralStatusScreen} options={{ title: 'Referral Status' }} />
      <Stack.Screen name="Vaccinations" component={VaccinationsScreen} />
      <Stack.Screen name="MedicineOrders" component={MedicineOrdersScreen} options={{ title: 'Medicine Orders' }} />
      <Stack.Screen name="AudioPrescription" component={AudioPrescriptionScreen} options={{ title: 'Audio Prescription' }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} options={{ title: 'Family Members' }} />
    </Stack.Navigator>
  );
}
