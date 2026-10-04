/**
 * Site Context Utility
 * Explicitly separates and identifies the application domains:
 * - Consumer / Guest site: /t/:shortCode, / (home)
 * - Waiter / Staff site: /staff/*
 * - Admin site: /admin/*
 */

export function getCurrentPathname() {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.pathname;
  }
  return '';
}

export function isStaffRoute(pathname = getCurrentPathname()) {
  return pathname.startsWith('/staff');
}

export function isAdminRoute(pathname = getCurrentPathname()) {
  return pathname.startsWith('/admin');
}

export function isStaffOrAdminRoute(pathname = getCurrentPathname()) {
  return isStaffRoute(pathname) || isAdminRoute(pathname);
}

export function isGuestRoute(pathname = getCurrentPathname()) {
  return pathname.startsWith('/t/') || pathname === '/' || pathname.startsWith('/order/');
}

export function getCurrentSite(pathname = getCurrentPathname()) {
  if (isAdminRoute(pathname)) return 'admin';
  if (isStaffRoute(pathname)) return 'staff';
  if (isGuestRoute(pathname)) return 'guest';
  return 'unknown';
}
