import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './services/auth/authContext';
import { ToastProvider } from './components/ui/Toast';
import { I18nProvider } from './hooks/useI18n';

// --- Layout ---
import { AppShell } from './components/layout/AppShell';
import { PublicNavbar } from './components/layout/PublicNavbar';
import { PublicFooter } from './components/layout/PublicFooter';

// --- Public Pages (eagerly loaded for fast first paint) ---
import { HomePage } from './pages/public/Home';
import { AboutPage } from './pages/public/About';
import { FacilitiesPage } from './pages/public/Facilities';
import { FindMedicinesPage } from './pages/public/FindMedicines';
import { EmergencyPage as PublicEmergency } from './pages/public/Emergency';
import { HealthProgramsPage } from './pages/public/HealthPrograms';
import { ClinicalGuidelinesPage } from './pages/public/ClinicalGuidelines';
import { NewsPage } from './pages/public/News';
import { ContactPage } from './pages/public/Contact';

// --- Auth Pages ---
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { SelectRolePage } from './pages/auth/SelectRole';

// --- Shared Workspace (lazy) ---
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const MessagesPage = lazy(() => import('./pages/shared/MessagesPage').then(m => ({ default: m.MessagesPage })));
const CalendarPage = lazy(() => import('./pages/shared/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/shared/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HelpCenterPage = lazy(() => import('./pages/shared/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const AIAssistantPage = lazy(() => import('./pages/shared/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));

// --- ASHA Workspace (lazy) ---
const AshaDashboard = lazy(() => import('./pages/asha/Dashboard').then(m => ({ default: m.AshaDashboard })));
const AshaTasks = lazy(() => import('./pages/asha/Tasks').then(m => ({ default: m.AshaTasksPage })));
const AshaVillageMap = lazy(() => import('./pages/asha/VillageMap').then(m => ({ default: m.AshaVillageMapPage })));
const AshaRegisterPatient = lazy(() => import('./pages/asha/RegisterPatient').then(m => ({ default: m.AshaRegisterPatientPage })));
const AshaMyPatients = lazy(() => import('./pages/asha/MyPatients').then(m => ({ default: m.AshaMyPatientsPage })));
const AshaVisitLog = lazy(() => import('./pages/asha/VisitLog').then(m => ({ default: m.AshaVisitLogPage })));
const AshaHomeVisits = lazy(() => import('./pages/asha/HomeVisits').then(m => ({ default: m.AshaHomeVisitsPage })));
const AshaImmunization = lazy(() => import('./pages/asha/Immunization').then(m => ({ default: m.AshaImmunizationPage })));
const AshaMaternalCare = lazy(() => import('./pages/asha/MaternalCare').then(m => ({ default: m.AshaMaternalCarePage })));
const AshaNcdScreening = lazy(() => import('./pages/asha/NcdScreening').then(m => ({ default: m.AshaNcdScreeningPage })));
const AshaReferrals = lazy(() => import('./pages/asha/Referrals').then(m => ({ default: m.AshaReferralsPage })));
const AshaOfflineSync = lazy(() => import('./pages/asha/OfflineSync').then(m => ({ default: m.AshaOfflineSyncPage })));
const AshaDocuments = lazy(() => import('./pages/asha/Documents').then(m => ({ default: m.AshaDocumentsPage })));
const AshaReports = lazy(() => import('./pages/asha/Reports').then(m => ({ default: m.AshaReportsPage })));

// --- Doctor Workspace (lazy) ---
const DoctorDashboard = lazy(() => import('./pages/doctor/Dashboard').then(m => ({ default: m.DoctorDashboard })));
const DoctorLiveQueue = lazy(() => import('./pages/doctor/LiveQueue').then(m => ({ default: m.DoctorLiveQueuePage })));
const DoctorPatientRecords = lazy(() => import('./pages/doctor/PatientRecords').then(m => ({ default: m.DoctorPatientRecordsPage })));
const DoctorConsultation = lazy(() => import('./pages/doctor/Consultation').then(m => ({ default: m.DoctorConsultationPage })));
const DoctorAITriage = lazy(() => import('./pages/doctor/AITriage').then(m => ({ default: m.DoctorAITriagePage })));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/Prescriptions').then(m => ({ default: m.DoctorPrescriptionsPage })));
const DoctorLabOrders = lazy(() => import('./pages/doctor/LabOrders').then(m => ({ default: m.DoctorLabOrdersPage })));
const DoctorReferralCenter = lazy(() => import('./pages/doctor/ReferralCenter').then(m => ({ default: m.DoctorReferralCenterPage })));
const DoctorTelemedicine = lazy(() => import('./pages/doctor/Telemedicine').then(m => ({ default: m.DoctorTelemedicinePage })));
const DoctorDrugInventory = lazy(() => import('./pages/doctor/DrugInventory').then(m => ({ default: m.DoctorDrugInventoryPage })));
const DoctorAnalytics = lazy(() => import('./pages/doctor/DoctorAnalytics').then(m => ({ default: m.DoctorAnalyticsPage })));

// --- Specialist Workspace (lazy) ---
const SpecialistDashboard = lazy(() => import('./pages/specialist/Dashboard').then(m => ({ default: m.SpecialistDashboard })));
const SpecialistReferralQueue = lazy(() => import('./pages/specialist/ReferralQueue').then(m => ({ default: m.SpecialistReferralQueuePage })));
const SpecialistBedAvailability = lazy(() => import('./pages/specialist/BedAvailability').then(m => ({ default: m.SpecialistBedAvailability })));
const SpecialistConsultations = lazy(() => import('./pages/specialist/Consultations').then(m => ({ default: m.SpecialistConsultations })));
const SpecialistTreatmentPlans = lazy(() => import('./pages/specialist/TreatmentPlans').then(m => ({ default: m.SpecialistTreatmentPlans })));
const SpecialistFollowUps = lazy(() => import('./pages/specialist/FollowUps').then(m => ({ default: m.SpecialistFollowUps })));
const SpecialistDischarge = lazy(() => import('./pages/specialist/Discharge').then(m => ({ default: m.SpecialistDischarge })));

// --- Admin Workspace (lazy) ---
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminStateAnalytics = lazy(() => import('./pages/admin/StateAnalytics').then(m => ({ default: m.AdminStateAnalytics })));
const AdminDistrictAnalytics = lazy(() => import('./pages/admin/DistrictAnalytics').then(m => ({ default: m.AdminDistrictAnalytics })));
const AdminFacilityManagement = lazy(() => import('./pages/admin/FacilityManagement').then(m => ({ default: m.AdminFacilityManagement })));
const AdminInventoryManagement = lazy(() => import('./pages/admin/InventoryManagement').then(m => ({ default: m.AdminInventoryManagement })));
const AdminStaffManagement = lazy(() => import('./pages/admin/StaffManagement').then(m => ({ default: m.AdminStaffManagement })));
const AdminHeatmaps = lazy(() => import('./pages/admin/Heatmaps').then(m => ({ default: m.AdminHeatmaps })));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs').then(m => ({ default: m.AdminAuditLogs })));
const AdminReports = lazy(() => import('./pages/admin/Reports').then(m => ({ default: m.AdminReports })));
const AdminAIInsights = lazy(() => import('./pages/admin/AIInsights').then(m => ({ default: m.AdminAIInsights })));

// --- Patient Portal (lazy) ---
const PatientDashboard = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientDashboard })));
const PatientTimeline = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientTimeline })));
const PatientPrescriptions = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientPrescriptions })));
const PatientLabReports = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientLabReports })));
const PatientAppointments = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientAppointments })));
const PatientReferralStatus = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientReferralStatus })));
const PatientAudioPrescription = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientAudioPrescription })));
const PatientVaccinations = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientVaccinations })));
const PatientEmergency = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientEmergency })));
const PatientFamilyMembers = lazy(() => import('./pages/patient').then(m => ({ default: m.PatientFamilyMembers })));

// ─── Query Client ───────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// ─── Page Loading Fallback ───────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-gov-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">Loading workspace…</p>
    </div>
  </div>
);

// ─── Public Layout (navbar + footer) ────────────────────────────────────────
const PublicLayout: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <PublicNavbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <PublicFooter />
  </div>
);

// ─── Role-based default redirect ────────────────────────────────────────────
const RoleRedirect: React.FC = () => {
  const { currentRole } = useAuth();
  const roleDefaults: Record<string, string> = {
    asha: '/asha/dashboard',
    doctor: '/doctor/dashboard',
    specialist: '/specialist/dashboard',
    admin: '/admin/dashboard',
    patient: '/patient/dashboard',
  };
  return <Navigate to={roleDefaults[currentRole] ?? '/patient/dashboard'} replace />;
};

// ─── Protected Route Guard ───────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ allowedRoles?: string[] }> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, currentRole } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

// ─── Router Definition ───────────────────────────────────────────────────────
const router = createBrowserRouter([
  // ── Public Routes ──
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/facilities', element: <FacilitiesPage /> },
      { path: '/find-medicines', element: <FindMedicinesPage /> },
      { path: '/emergency', element: <PublicEmergency /> },
      { path: '/health-programs', element: <HealthProgramsPage /> },
      { path: '/clinical-guidelines', element: <ClinicalGuidelinesPage /> },
      { path: '/news', element: <NewsPage /> },
      { path: '/contact', element: <ContactPage /> },
    ],
  },

  // ── Auth Routes ──
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/select-role', element: <SelectRolePage /> },
    ],
  },

  // ── Authenticated App Shell ──
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Role redirect
          { path: '/dashboard', element: <RoleRedirect /> },

          // Shared workspace
          {
            children: [
              { path: '/notifications', element: <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense> },
              { path: '/messages', element: <Suspense fallback={<PageLoader />}><MessagesPage /></Suspense> },
              { path: '/calendar', element: <Suspense fallback={<PageLoader />}><CalendarPage /></Suspense> },
              { path: '/profile', element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense> },
              { path: '/settings', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
              { path: '/help', element: <Suspense fallback={<PageLoader />}><HelpCenterPage /></Suspense> },
              { path: '/ai-assistant', element: <Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense> },
            ],
          },

          // ASHA Workspace
          {
            element: <ProtectedRoute allowedRoles={['asha']} />,
            children: [
              { path: '/asha', element: <Navigate to="/asha/dashboard" replace /> },
              { path: '/asha/dashboard', element: <Suspense fallback={<PageLoader />}><AshaDashboard /></Suspense> },
              { path: '/asha/tasks', element: <Suspense fallback={<PageLoader />}><AshaTasks /></Suspense> },
              { path: '/asha/map', element: <Suspense fallback={<PageLoader />}><AshaVillageMap /></Suspense> },
              { path: '/asha/register-patient', element: <Suspense fallback={<PageLoader />}><AshaRegisterPatient /></Suspense> },
              { path: '/asha/patients', element: <Suspense fallback={<PageLoader />}><AshaMyPatients /></Suspense> },
              { path: '/asha/visit-log', element: <Suspense fallback={<PageLoader />}><AshaVisitLog /></Suspense> },
              { path: '/asha/home-visits', element: <Suspense fallback={<PageLoader />}><AshaHomeVisits /></Suspense> },
              { path: '/asha/immunization', element: <Suspense fallback={<PageLoader />}><AshaImmunization /></Suspense> },
              { path: '/asha/maternal-care', element: <Suspense fallback={<PageLoader />}><AshaMaternalCare /></Suspense> },
              { path: '/asha/ncd-screening', element: <Suspense fallback={<PageLoader />}><AshaNcdScreening /></Suspense> },
              { path: '/asha/referrals', element: <Suspense fallback={<PageLoader />}><AshaReferrals /></Suspense> },
              { path: '/asha/offline-sync', element: <Suspense fallback={<PageLoader />}><AshaOfflineSync /></Suspense> },
              { path: '/asha/documents', element: <Suspense fallback={<PageLoader />}><AshaDocuments /></Suspense> },
              { path: '/asha/reports', element: <Suspense fallback={<PageLoader />}><AshaReports /></Suspense> },
            ],
          },

          // Doctor Workspace
          {
            element: <ProtectedRoute allowedRoles={['doctor']} />,
            children: [
              { path: '/doctor', element: <Navigate to="/doctor/dashboard" replace /> },
              { path: '/doctor/dashboard', element: <Suspense fallback={<PageLoader />}><DoctorDashboard /></Suspense> },
              { path: '/doctor/queue', element: <Suspense fallback={<PageLoader />}><DoctorLiveQueue /></Suspense> },
              { path: '/doctor/patients', element: <Suspense fallback={<PageLoader />}><DoctorPatientRecords /></Suspense> },
              { path: '/doctor/consultation', element: <Suspense fallback={<PageLoader />}><DoctorConsultation /></Suspense> },
              { path: '/doctor/ai-triage', element: <Suspense fallback={<PageLoader />}><DoctorAITriage /></Suspense> },
              { path: '/doctor/prescriptions', element: <Suspense fallback={<PageLoader />}><DoctorPrescriptions /></Suspense> },
              { path: '/doctor/lab-orders', element: <Suspense fallback={<PageLoader />}><DoctorLabOrders /></Suspense> },
              { path: '/doctor/referrals', element: <Suspense fallback={<PageLoader />}><DoctorReferralCenter /></Suspense> },
              { path: '/doctor/telemedicine', element: <Suspense fallback={<PageLoader />}><DoctorTelemedicine /></Suspense> },
              { path: '/doctor/inventory', element: <Suspense fallback={<PageLoader />}><DoctorDrugInventory /></Suspense> },
              { path: '/doctor/analytics', element: <Suspense fallback={<PageLoader />}><DoctorAnalytics /></Suspense> },
            ],
          },

          // Specialist Workspace
          {
            element: <ProtectedRoute allowedRoles={['specialist']} />,
            children: [
              { path: '/specialist', element: <Navigate to="/specialist/dashboard" replace /> },
              { path: '/specialist/dashboard', element: <Suspense fallback={<PageLoader />}><SpecialistDashboard /></Suspense> },
              { path: '/specialist/referrals', element: <Suspense fallback={<PageLoader />}><SpecialistReferralQueue /></Suspense> },
              { path: '/specialist/beds', element: <Suspense fallback={<PageLoader />}><SpecialistBedAvailability /></Suspense> },
              { path: '/specialist/consultations', element: <Suspense fallback={<PageLoader />}><SpecialistConsultations /></Suspense> },
              { path: '/specialist/treatment-plans', element: <Suspense fallback={<PageLoader />}><SpecialistTreatmentPlans /></Suspense> },
              { path: '/specialist/follow-ups', element: <Suspense fallback={<PageLoader />}><SpecialistFollowUps /></Suspense> },
              { path: '/specialist/discharge', element: <Suspense fallback={<PageLoader />}><SpecialistDischarge /></Suspense> },
            ],
          },

          // Admin Workspace
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
              { path: '/admin/dashboard', element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
              { path: '/admin/state-analytics', element: <Suspense fallback={<PageLoader />}><AdminStateAnalytics /></Suspense> },
              { path: '/admin/district-analytics', element: <Suspense fallback={<PageLoader />}><AdminDistrictAnalytics /></Suspense> },
              { path: '/admin/facilities', element: <Suspense fallback={<PageLoader />}><AdminFacilityManagement /></Suspense> },
              { path: '/admin/inventory', element: <Suspense fallback={<PageLoader />}><AdminInventoryManagement /></Suspense> },
              { path: '/admin/staff', element: <Suspense fallback={<PageLoader />}><AdminStaffManagement /></Suspense> },
              { path: '/admin/heatmaps', element: <Suspense fallback={<PageLoader />}><AdminHeatmaps /></Suspense> },
              { path: '/admin/audit-logs', element: <Suspense fallback={<PageLoader />}><AdminAuditLogs /></Suspense> },
              { path: '/admin/reports', element: <Suspense fallback={<PageLoader />}><AdminReports /></Suspense> },
              { path: '/admin/ai-insights', element: <Suspense fallback={<PageLoader />}><AdminAIInsights /></Suspense> },
            ],
          },

          // Patient Portal
          {
            element: <ProtectedRoute allowedRoles={['patient']} />,
            children: [
              { path: '/patient', element: <Navigate to="/patient/dashboard" replace /> },
              { path: '/patient/dashboard', element: <Suspense fallback={<PageLoader />}><PatientDashboard /></Suspense> },
              { path: '/patient/timeline', element: <Suspense fallback={<PageLoader />}><PatientTimeline /></Suspense> },
              { path: '/patient/prescriptions', element: <Suspense fallback={<PageLoader />}><PatientPrescriptions /></Suspense> },
              { path: '/patient/lab-reports', element: <Suspense fallback={<PageLoader />}><PatientLabReports /></Suspense> },
              { path: '/patient/appointments', element: <Suspense fallback={<PageLoader />}><PatientAppointments /></Suspense> },
              { path: '/patient/referrals', element: <Suspense fallback={<PageLoader />}><PatientReferralStatus /></Suspense> },
              { path: '/patient/audio-prescription', element: <Suspense fallback={<PageLoader />}><PatientAudioPrescription /></Suspense> },
              { path: '/patient/vaccinations', element: <Suspense fallback={<PageLoader />}><PatientVaccinations /></Suspense> },
              { path: '/patient/emergency', element: <Suspense fallback={<PageLoader />}><PatientEmergency /></Suspense> },
              { path: '/patient/family', element: <Suspense fallback={<PageLoader />}><PatientFamilyMembers /></Suspense> },
            ],
          },
        ],
      },
    ],
  },

  // ── Catch-all ──
  { path: '*', element: <Navigate to="/" replace /> },
]);

// ─── Root App Component ───────────────────────────────────────────────────────
export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  </QueryClientProvider>
);
