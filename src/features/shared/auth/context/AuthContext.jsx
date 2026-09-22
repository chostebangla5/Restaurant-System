import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchStaffProfiles } from '../api/authApi';

const AuthContext = createContext({
  user: null,
  session: null,
  staffProfile: null,
  staffProfiles: [],
  role: null,
  venueId: null,
  orgId: null,
  venue: null,
  organization: null,
  isLoading: true,
  signInWithPassword: async () => {},
  signOut: async () => {},
  switchVenue: () => {},
  refreshProfiles: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const staffProfile = staffProfiles[activeProfileIndex] || null;
  const role = staffProfile?.role ?? null;
  const venueId = staffProfile?.venue_id ?? null;
  const orgId = staffProfile?.org_id ?? null;
  const venue = staffProfile?.venues ?? null;
  const organization = staffProfile?.organizations ?? null;

  const loadProfiles = useCallback(async (authUserId) => {
    try {
      let profiles = await fetchStaffProfiles(authUserId);
      
      // Fallback: If no staff profile row exists yet, auto-link to first active venue
      if (!profiles || profiles.length === 0) {
        const { data: venues } = await supabase
          .from('venues')
          .select('*')
          .eq('is_active', true)
          .limit(1);

        if (venues && venues.length > 0) {
          const v = venues[0];
          profiles = [{
            id: 'owner-' + v.id,
            org_id: v.org_id,
            venue_id: v.id,
            role: 'owner',
            full_name: 'Restaurant Owner',
            venues: v,
          }];
        }
      }

      setStaffProfiles(profiles);

      // Restore last-active venue from localStorage if available
      const savedVenueId = localStorage.getItem('ts_active_venue');
      if (savedVenueId) {
        const idx = profiles.findIndex((p) => p.venue_id === savedVenueId);
        if (idx >= 0) {
          setActiveProfileIndex(idx);
        }
      }
    } catch (err) {
      console.warn('Failed to load staff profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfiles(s.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfiles(s.user.id);
      } else {
        setStaffProfiles([]);
        setActiveProfileIndex(0);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfiles]);

  const signInWithPassword = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please verify your environment settings.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    localStorage.removeItem('ts_active_venue');
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setStaffProfiles([]);
    setActiveProfileIndex(0);
  };

  const switchVenue = (targetVenueId) => {
    const idx = staffProfiles.findIndex((p) => p.venue_id === targetVenueId);
    if (idx >= 0) {
      setActiveProfileIndex(idx);
      localStorage.setItem('ts_active_venue', targetVenueId);
    }
  };

  const refreshProfiles = async () => {
    if (user?.id) {
      await loadProfiles(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        staffProfile,
        staffProfiles,
        role,
        venueId,
        orgId,
        venue,
        organization,
        isLoading,
        signInWithPassword,
        signOut,
        switchVenue,
        refreshProfiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
