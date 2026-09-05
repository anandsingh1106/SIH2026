import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert, Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '../services/auth/authContext';
import type { AshaStackParamList } from './types';
import { DashboardScreen } from '../screens/asha/DashboardScreen';
import { TasksScreen } from '../screens/asha/TasksScreen';
import { MyPatientsScreen } from '../screens/asha/MyPatientsScreen';
import { RegisterPatientScreen } from '../screens/asha/RegisterPatientScreen';
import { HomeVisitsScreen } from '../screens/asha/HomeVisitsScreen';
import { VisitLogScreen } from '../screens/asha/VisitLogScreen';
import { ReferralsScreen } from '../screens/asha/ReferralsScreen';
import { ImmunizationScreen } from '../screens/asha/ImmunizationScreen';
import { NcdScreeningScreen } from '../screens/asha/NcdScreeningScreen';
import { OfflineSyncScreen } from '../screens/asha/OfflineSyncScreen';
import { VillageMapScreen } from '../screens/asha/VillageMapScreen';
import { DocumentsScreen } from '../screens/asha/DocumentsScreen';
import { ReportsScreen } from '../screens/asha/ReportsScreen';
import { MaternalCareScreen } from '../screens/asha/MaternalCareScreen';

const Stack = createNativeStackNavigator<AshaStackParamList>();

/** ASHA role screens, matching frontend/src/App.tsx's /asha/* route tree. */
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

export function AshaStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="AshaDashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="MyPatients" component={MyPatientsScreen} options={{ title: 'My Patients' }} />
      <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen} options={{ title: 'Register Patient' }} />
      <Stack.Screen name="HomeVisits" component={HomeVisitsScreen} options={{ title: 'Home Visits' }} />
      <Stack.Screen name="VisitLog" component={VisitLogScreen} options={{ title: 'Visit Log' }} />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />
      <Stack.Screen name="Immunization" component={ImmunizationScreen} />
      <Stack.Screen name="NcdScreening" component={NcdScreeningScreen} options={{ title: 'NCD Screening' }} />
      <Stack.Screen name="OfflineSync" component={OfflineSyncScreen} options={{ title: 'Offline Sync' }} />
      <Stack.Screen name="VillageMap" component={VillageMapScreen} options={{ title: 'Village Map' }} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="MaternalCare" component={MaternalCareScreen} options={{ title: 'Maternal Care' }} />
    </Stack.Navigator>
  );
}
