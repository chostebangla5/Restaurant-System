import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/app/layouts/RootLayout';
import { GuestLayout } from '@/app/layouts/GuestLayout';
import { StaffLayout } from '@/app/layouts/StaffLayout';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { lazyWithRetry, preloadRoute } from '@/lib/lazyWithRetry';

// Factories for lazy-loaded views (enables on-demand idle preloading)
const loadHomeScreen = () =>
  import('@/features/guest/home/components/HomeScreen').then((m) => ({
    default: m.HomeScreen,
  }));

const loadGuestMenuScreen = () =>
  import('@/features/guest/menu/components/GuestMenuScreen').then((m) => ({
    default: m.GuestMenuScreen,
  }));

const loadGuestCartScreen = () =>
  import('@/features/guest/cart/components/GuestCartScreen').then((m) => ({
    default: m.GuestCartScreen,
  }));

const loadGuestOrderStatusScreen = () =>
  import('@/features/guest/orders/components/GuestOrderStatusScreen').then((m) => ({
    default: m.GuestOrderStatusScreen,
  }));

const loadStaffLoginScreen = () =>
  import('@/features/shared/auth/components/StaffLoginScreen').then((m) => ({
    default: m.StaffLoginScreen,
  }));

const loadStaffDashboardScreen = () =>
  import('@/features/staff/dashboard/components/StaffDashboardScreen').then((m) => ({
    default: m.StaffDashboardScreen,
  }));

const loadStaffLiveOrdersScreen = () =>
  import('@/features/staff/live-orders/components/StaffLiveOrdersScreen').then((m) => ({
    default: m.StaffLiveOrdersScreen,
  }));

const loadStaffKitchenScreen = () =>
  import('@/features/staff/kitchen/components/StaffKitchenScreen').then((m) => ({
    default: m.StaffKitchenScreen,
  }));

const loadStaffTablesScreen = () =>
  import('@/features/staff/tables/components/StaffTablesScreen').then((m) => ({
    default: m.StaffTablesScreen,
  }));

const loadStaffMenuScreen = () =>
  import('@/features/staff/menu-management/components/StaffMenuScreen').then((m) => ({
    default: m.StaffMenuScreen,
  }));

const loadStaffBillingScreen = () =>
  import('@/features/staff/billing/components/StaffBillingScreen').then((m) => ({
    default: m.StaffBillingScreen,
  }));

const loadStaffQrScreen = () =>
  import('@/features/staff/qr-codes/components/StaffQrScreen').then((m) => ({
    default: m.StaffQrScreen,
  }));

const loadStaffOffersScreen = () =>
  import('@/features/staff/offers/components/StaffOffersScreen').then((m) => ({
    default: m.StaffOffersScreen,
  }));

const loadStaffGuestsScreen = () =>
  import('@/features/staff/guests/components/StaffGuestsScreen').then((m) => ({
    default: m.StaffGuestsScreen,
  }));

const loadStaffSettingsScreen = () =>
  import('@/features/staff/settings/components/StaffSettingsScreen').then((m) => ({
    default: m.StaffSettingsScreen,
  }));

const loadStaffTeamScreen = () =>
  import('@/features/staff/team/components/StaffTeamScreen').then((m) => ({
    default: m.StaffTeamScreen,
  }));

const loadStaffInvoicesScreen = () =>
  import('@/features/staff/invoices/components/StaffInvoicesScreen').then((m) => ({
    default: m.StaffInvoicesScreen,
  }));

const loadStaffFeedbackScreen = () =>
  import('@/features/staff/feedback/components/StaffFeedbackScreen').then((m) => ({
    default: m.StaffFeedbackScreen,
  }));

// Preload critical flows into browser memory
export function preloadGuestFlow() {
  preloadRoute(loadGuestMenuScreen);
  preloadRoute(loadGuestCartScreen);
  preloadRoute(loadGuestOrderStatusScreen);
}

export function preloadStaffFlow() {
  preloadRoute(loadStaffDashboardScreen);
  preloadRoute(loadStaffLiveOrdersScreen);
  preloadRoute(loadStaffKitchenScreen);
  preloadRoute(loadStaffTablesScreen);
}

// Resilient Lazy Components with retry & auto-refresh on new deployments
const HomeScreen = lazyWithRetry(loadHomeScreen, 'HomeScreen');
const GuestMenuScreen = lazyWithRetry(loadGuestMenuScreen, 'GuestMenuScreen');
const GuestCartScreen = lazyWithRetry(loadGuestCartScreen, 'GuestCartScreen');
const GuestOrderStatusScreen = lazyWithRetry(loadGuestOrderStatusScreen, 'GuestOrderStatusScreen');
const StaffLoginScreen = lazyWithRetry(loadStaffLoginScreen, 'StaffLoginScreen');
const StaffDashboardScreen = lazyWithRetry(loadStaffDashboardScreen, 'StaffDashboardScreen');
const StaffLiveOrdersScreen = lazyWithRetry(loadStaffLiveOrdersScreen, 'StaffLiveOrdersScreen');
const StaffKitchenScreen = lazyWithRetry(loadStaffKitchenScreen, 'StaffKitchenScreen');
const StaffTablesScreen = lazyWithRetry(loadStaffTablesScreen, 'StaffTablesScreen');
const StaffMenuScreen = lazyWithRetry(loadStaffMenuScreen, 'StaffMenuScreen');
const StaffBillingScreen = lazyWithRetry(loadStaffBillingScreen, 'StaffBillingScreen');
const StaffQrScreen = lazyWithRetry(loadStaffQrScreen, 'StaffQrScreen');
const StaffOffersScreen = lazyWithRetry(loadStaffOffersScreen, 'StaffOffersScreen');
const StaffGuestsScreen = lazyWithRetry(loadStaffGuestsScreen, 'StaffGuestsScreen');
const StaffSettingsScreen = lazyWithRetry(loadStaffSettingsScreen, 'StaffSettingsScreen');
const StaffTeamScreen = lazyWithRetry(loadStaffTeamScreen, 'StaffTeamScreen');
const StaffInvoicesScreen = lazyWithRetry(loadStaffInvoicesScreen, 'StaffInvoicesScreen');
const StaffFeedbackScreen = lazyWithRetry(loadStaffFeedbackScreen, 'StaffFeedbackScreen');

function SuspenseFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HomeScreen />
          </Suspense>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <StaffLoginScreen />
          </Suspense>
        ),
      },
      // Guest Experience Routes (/t/:shortCode/*)
      {
        path: 't/:shortCode',
        element: <GuestLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <GuestMenuScreen />
              </Suspense>
            ),
          },
          {
            path: 'cart',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <GuestCartScreen />
              </Suspense>
            ),
          },
          {
            path: 'orders',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <GuestOrderStatusScreen />
              </Suspense>
            ),
          },
        ],
      },
      // Staff Experience Routes (/staff/*)
      {
        path: 'staff',
        element: (
          <ProtectedRoute>
            <StaffLayout />
          </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffDashboardScreen />
              </Suspense>
            ),
          },
          {
            path: 'live-orders',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffLiveOrdersScreen />
              </Suspense>
            ),
          },
          {
            path: 'kitchen',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffKitchenScreen />
              </Suspense>
            ),
          },
          {
            path: 'tables',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffTablesScreen />
              </Suspense>
            ),
          },
          {
            path: 'menu',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffMenuScreen />
              </Suspense>
            ),
          },
          {
            path: 'billing',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffBillingScreen />
              </Suspense>
            ),
          },
          {
            path: 'qr-codes',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffQrScreen />
              </Suspense>
            ),
          },
          {
            path: 'team',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffTeamScreen />
              </Suspense>
            ),
          },
          {
            path: 'offers',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffOffersScreen />
              </Suspense>
            ),
          },
          {
            path: 'guests',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffGuestsScreen />
              </Suspense>
            ),
          },
          {
            path: 'invoices',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffInvoicesScreen />
              </Suspense>
            ),
          },
          {
            path: 'feedback',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffFeedbackScreen />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <StaffSettingsScreen />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
