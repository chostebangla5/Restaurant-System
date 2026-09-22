import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/app/layouts/RootLayout';
import { GuestLayout } from '@/app/layouts/GuestLayout';
import { StaffLayout } from '@/app/layouts/StaffLayout';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';

// Lazy-loaded views
const HomeScreen = lazy(() =>
  import('@/features/guest/home/components/HomeScreen').then((m) => ({
    default: m.HomeScreen,
  }))
);

const GuestMenuScreen = lazy(() =>
  import('@/features/guest/menu/components/GuestMenuScreen').then((m) => ({
    default: m.GuestMenuScreen,
  }))
);

const GuestCartScreen = lazy(() =>
  import('@/features/guest/cart/components/GuestCartScreen').then((m) => ({
    default: m.GuestCartScreen,
  }))
);

const GuestOrderStatusScreen = lazy(() =>
  import('@/features/guest/orders/components/GuestOrderStatusScreen').then((m) => ({
    default: m.GuestOrderStatusScreen,
  }))
);

const StaffLoginScreen = lazy(() =>
  import('@/features/shared/auth/components/StaffLoginScreen').then((m) => ({
    default: m.StaffLoginScreen,
  }))
);

const StaffDashboardScreen = lazy(() =>
  import('@/features/staff/dashboard/components/StaffDashboardScreen').then((m) => ({
    default: m.StaffDashboardScreen,
  }))
);

const StaffLiveOrdersScreen = lazy(() =>
  import('@/features/staff/live-orders/components/StaffLiveOrdersScreen').then((m) => ({
    default: m.StaffLiveOrdersScreen,
  }))
);

const StaffKitchenScreen = lazy(() =>
  import('@/features/staff/kitchen/components/StaffKitchenScreen').then((m) => ({
    default: m.StaffKitchenScreen,
  }))
);

const StaffTablesScreen = lazy(() =>
  import('@/features/staff/tables/components/StaffTablesScreen').then((m) => ({
    default: m.StaffTablesScreen,
  }))
);

const StaffMenuScreen = lazy(() =>
  import('@/features/staff/menu-management/components/StaffMenuScreen').then((m) => ({
    default: m.StaffMenuScreen,
  }))
);

const StaffBillingScreen = lazy(() =>
  import('@/features/staff/billing/components/StaffBillingScreen').then((m) => ({
    default: m.StaffBillingScreen,
  }))
);

const StaffQrScreen = lazy(() =>
  import('@/features/staff/qr-codes/components/StaffQrScreen').then((m) => ({
    default: m.StaffQrScreen,
  }))
);

const StaffOffersScreen = lazy(() =>
  import('@/features/staff/offers/components/StaffOffersScreen').then((m) => ({
    default: m.StaffOffersScreen,
  }))
);

const StaffGuestsScreen = lazy(() =>
  import('@/features/staff/guests/components/StaffGuestsScreen').then((m) => ({
    default: m.StaffGuestsScreen,
  }))
);

const StaffSettingsScreen = lazy(() =>
  import('@/features/staff/settings/components/StaffSettingsScreen').then((m) => ({
    default: m.StaffSettingsScreen,
  }))
);

const StaffTeamScreen = lazy(() =>
  import('@/features/staff/team/components/StaffTeamScreen').then((m) => ({
    default: m.StaffTeamScreen,
  }))
);

const StaffInvoicesScreen = lazy(() =>
  import('@/features/staff/invoices/components/StaffInvoicesScreen').then((m) => ({
    default: m.StaffInvoicesScreen,
  }))
);

const StaffFeedbackScreen = lazy(() =>
  import('@/features/staff/feedback/components/StaffFeedbackScreen').then((m) => ({
    default: m.StaffFeedbackScreen,
  }))
);

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
