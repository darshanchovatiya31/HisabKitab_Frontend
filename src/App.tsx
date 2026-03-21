import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";

import UserProfiles from "./pages/UserProfiles";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Company Management Pages
import CompanyDashboard from "./pages/Company/Dashboard";
import CompaniesPage from "./pages/Company/Companies";
// import Register from "./pages/AuthPages/Register";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#1E3A8A] dark:border-gray-700 dark:border-t-[#0891b2]"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#1E3A8A] dark:border-gray-700 dark:border-t-[#0891b2]"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Redirect based on user role
  let redirectPath = '/company/dashboard';
  if (user) {
    const userRole = (user as any).role;
    if (['SUPER_ADMIN', 'COMPANY'].includes(userRole)) {
      redirectPath = '/company/dashboard';
    }
  }

  return <Navigate to={redirectPath} replace />;
}

// Dashboard Redirect Component - redirects based on user role
function DashboardRedirect() {
  const { user } = useAuth();

  if (user) {
    const userRole = (user as any).role;
    // Redirect all roles to their appropriate dashboard
    if (['SUPER_ADMIN', 'COMPANY'].includes(userRole)) {
      return <Navigate to="/company/dashboard" replace />;
    }
  }

  // Fallback: redirect to company dashboard if no role matches
  return <Navigate to="/company/dashboard" replace />;
}

function AppRoutes() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index path="/" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfiles />
            </ProtectedRoute>
          } />

          {/* Company Management Routes */}
          <Route path="/company/dashboard" element={
            <ProtectedRoute>
              <CompanyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/company/companies" element={
            <ProtectedRoute>
              <CompaniesPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* delete route:- Patients, Categories, Doctors & Labs, Slots, BookingHistory */}

        {/* Auth Layout */}
        <Route path="/signin" element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        } />
        {/* Super Admin Registration Route - Commented out after initial setup */}
        {/* <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } /> */}

        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
