import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi } from '@arogyasetu/shared/services/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

interface Stats {
  patients: number;
  facilities: number;
  healthWorkers: number;
  districts: number;
}

/**
 * The mobile counterpart to frontend/src/pages/public/Home.tsx.
 *
 * The app opened straight onto a sign-in form, so a visitor without an account
 * met a password field and nothing else — no way to reach the ambulance
 * number, and nothing saying what the app is for. Web has a public landing
 * page for exactly that visitor; mobile had none.
 *
 * This carries the parts of that page which make sense on a phone: what the
 * platform is, the emergency number, and the way in. The web page's district
 * heatmaps, trend charts, problem/solution grids and FAQ are deliberately left
 * out — they are a desk-sized read, and repeating them here would bury the two
 * things someone opening this on a phone actually needs.
 */
export function LandingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    backendApi
      .getPlatformStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      // The landing page must render without a backend — an unreachable API is
      // no reason to keep a visitor from the 108 number. The strip is omitted
      // rather than showing zeroes, which would misreport a live deployment as
      // an empty one.
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const callAmbulance = () => {
    Linking.openURL('tel:108').catch(() => {
      /* A device with no dialler (a tablet, the web build) — nothing to do. */
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>+</Text>
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandName}>MahaAarogya Sangam</Text>
          <Text style={styles.brandTag}>Digital Public Health Platform</Text>
        </View>
      </View>

      <Text style={styles.heroTitle}>Healthcare that reaches your village</Text>
      <Text style={styles.heroSubtitle}>
        Health records, appointments and referrals in one place — connecting frontline
        ASHA workers, primary health centres and specialists across Maharashtra.
      </Text>

      {/* The emergency panel sits above the sign-in buttons and the statistics.
          Someone who opened this app in an emergency should not have to read a
          word of marketing to find the number. */}
      <Pressable style={styles.emergencyCard} onPress={callAmbulance} accessibilityRole="button">
        <View style={styles.emergencyIcon}>
          <Text style={styles.emergencyIconText}>✆</Text>
        </View>
        <Text style={styles.emergencyLabel}>Need emergency help?</Text>
        <Text style={styles.emergencyNumber}>108</Text>
        <Text style={styles.emergencyHint}>Tap to call — free 24x7 ambulance</Text>
      </Pressable>

      <View style={styles.ctaBlock}>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryButtonText}>Create an Account</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeading}>What you can do here</Text>
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: f.tint }]}>
              <Text style={styles.featureIconText}>{f.glyph}</Text>
            </View>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {isLoadingStats ? (
        <ActivityIndicator style={styles.statsSpinner} color="#15803D" />
      ) : stats ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsHeading}>Our impact</Text>
          <Text style={styles.statsCaption}>Live counts from this deployment</Text>
          <View style={styles.statsGrid}>
            <Stat value={stats.patients} label="Patients" />
            <Stat value={stats.facilities} label="Facilities" />
            <Stat value={stats.healthWorkers} label="Health workers" />
            <Stat value={stats.districts} label="Districts" />
          </View>
        </View>
      ) : null}

      <Text style={styles.footnote}>Government of Maharashtra · Public Health Department</Text>
    </ScrollView>
  );
}

/** Grouped, never rounded — the same treatment the web MetricCard gives them. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value.toLocaleString('en-IN')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Only what this app actually does. Mobile authenticates ASHA and patient
 * accounts alone, so the web page's command-centre and specialist-desk cards
 * would promise screens that do not exist here.
 */
const FEATURES = [
  {
    glyph: '☰',
    tint: '#DCFCE7',
    title: 'Your health timeline',
    desc: 'Prescriptions, lab reports and visits in one record.',
  },
  {
    glyph: '⊕',
    tint: '#DBEAFE',
    title: 'Appointments & referrals',
    desc: 'Book a visit and follow a referral through every stage.',
  },
  {
    glyph: '♪',
    tint: '#FEF3C7',
    title: 'Voice prescriptions',
    desc: 'Hear your prescription read aloud in your own language.',
  },
  {
    glyph: '⌂',
    tint: '#EDE9FE',
    title: 'Works offline',
    desc: 'ASHA workers record visits with no signal; it syncs later.',
  },
] as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { paddingHorizontal: 20 },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: '#15803D',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  brandText: { marginLeft: 12, flex: 1 },
  brandName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  brandTag: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  heroTitle: { fontSize: 27, fontWeight: '800', color: '#111827', lineHeight: 34 },
  heroSubtitle: { fontSize: 14, color: '#4B5563', lineHeight: 21, marginTop: 10 },

  emergencyCard: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16,
    padding: 20, marginTop: 22,
  },
  emergencyIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
  },
  emergencyIconText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emergencyLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 12 },
  emergencyNumber: { fontSize: 46, fontWeight: '800', color: '#B91C1C', lineHeight: 50, marginTop: 2 },
  emergencyHint: { fontSize: 12, color: '#7F1D1D', marginTop: 2 },

  ctaBlock: { marginTop: 22 },
  primaryButton: {
    backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 15, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#15803D', marginTop: 10,
  },
  secondaryButtonText: { color: '#15803D', fontSize: 15, fontWeight: '700' },

  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 34 },
  featureList: { marginTop: 14 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 10,
  },
  featureIcon: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  featureIconText: { fontSize: 17, color: '#111827' },
  featureBody: { flex: 1, marginLeft: 13 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  featureDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },

  statsSpinner: { marginTop: 34 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 18, marginTop: 30,
  },
  statsHeading: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statsCaption: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  statItem: { width: '50%', paddingVertical: 8 },
  statValue: { fontSize: 21, fontWeight: '800', color: '#15803D' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  footnote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 30 },
});
