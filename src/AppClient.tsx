'use client';
import { useSyncExternalStore } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/src/components/AppShell';
import { ToastProvider } from '@/src/components/ui/Toast';
import { runtime } from '@/src/config/runtime';
import { LandingPage } from '@/src/screens/LandingPage';
import { ApplicationStatusPage } from '@/src/screens/ApplicationStatusPage';
import { AuthLayout } from '@/src/screens/auth/AuthLayout';
import { ForgotPasswordPage } from '@/src/screens/auth/ForgotPasswordPage';
import { LoginPage } from '@/src/screens/auth/LoginPage';
import { RegisterPage } from '@/src/screens/auth/RegisterPage';
import { AccountPage } from '@/src/screens/app/AccountPage';
import { AnalyticsPage } from '@/src/screens/app/AnalyticsPage';
import { DashboardPage } from '@/src/screens/app/DashboardPage';
import { InventoryPage } from '@/src/screens/app/InventoryPage';
import { NotificationsPage } from '@/src/screens/app/NotificationsPage';
import { ProfilePage } from '@/src/screens/app/ProfilePage';
import { VerificationPage } from '@/src/screens/app/VerificationPage';

function ApprovedPharmacyRoutes() {
  if (!runtime.useMockData || runtime.demoApplicationStatus !== 'APPROVED') return <Navigate to="/application-status" replace />;
  return <AppShell />;
}

function NotFoundPage() {
  return <main className="not-found"><span>404</span><h1>This page isn’t in the pharmacy portal.</h1><p>Return to the public website or open the pharmacy sign-in page.</p><div><Link className="button" to="/">Go home</Link><Link className="button button-secondary" to="/login">Sign in</Link></div></main>;
}

export function AppClient() {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!mounted) return <div className="app-boot"><span className="brand-mark">+</span><p>Preparing pharmacy workspace…</p></div>;
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/application-status" element={<ApplicationStatusPage />} />
          <Route path="/app" element={<ApprovedPharmacyRoutes />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
