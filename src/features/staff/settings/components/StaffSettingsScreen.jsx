import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { useBranding } from '@/features/shared/branding';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';
import { StaffInviteModal } from './StaffInviteModal';
import {
  fetchVenue,
  updateVenue,
  fetchVenueSettings,
  updateVenueSettings,
  fetchStaffList,
  inviteStaff,
  updateStaffRole,
  deactivateStaff,
} from '../api/settingsApi';
import {
  PaintBrushIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const TAB_LIST = [
  { value: 'branding', label: 'Branding', icon: PaintBrushIcon },
  { value: 'business', label: 'Business Details', icon: BuildingStorefrontIcon },
  { value: 'staff', label: 'Staff Management', icon: UsersIcon },
];

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'waiter', label: 'Waiter' },
];

export function StaffSettingsScreen() {
  const { venueId, orgId, role: myRole } = useAuth();
  const { brandColor, updateBrandColor } = useBranding('#EA580C');

  const [activeTab, setActiveTab] = useState('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ─── Venue Data ─────────────────────────────────────────────────────────────
  const [venueData, setVenueData] = useState({
    id: '',
    name: '',
    slug: '',
    brand_color: '#EA580C',
    logo_url: '',
    address: '',
    phone: '',
    currency: 'INR',
    tax_rate: '5.00',
  });

  const [settingsData, setSettingsData] = useState({
    gstin: '',
    fssai_number: '',
    allow_guest_ordering: true,
    require_guest_phone: false,
    enable_sound_alerts: true,
  });

  // ─── Staff ──────────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState(null);

  // ─── Load Data ──────────────────────────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Load venue data (auto-resolves if venueId is not yet in state)
      const venue = await fetchVenue(venueId);
      if (venue) {
        setVenueData({
          id: venue.id,
          name: venue.name || '',
          slug: venue.slug || '',
          brand_color: venue.brand_color || '#EA580C',
          logo_url: venue.logo_url || '',
          address: venue.address || '',
          phone: venue.phone || '',
          currency: venue.currency || 'INR',
          tax_rate: venue.tax_rate?.toString() || '5.00',
        });
        if (venue.brand_color) {
          updateBrandColor(venue.brand_color);
        }

        const activeId = venue.id;

        // Load venue settings
        try {
          const settings = await fetchVenueSettings(activeId);
          if (settings) {
            setSettingsData({
              gstin: settings.gstin || '',
              fssai_number: settings.fssai_number || '',
              allow_guest_ordering: settings.allow_guest_ordering ?? true,
              require_guest_phone: settings.require_guest_phone ?? false,
              enable_sound_alerts: settings.enable_sound_alerts ?? true,
            });
          }
        } catch (settingsErr) {
          console.warn('Failed to load venue settings (non-critical):', settingsErr);
        }

        // Load staff list
        try {
          const staff = await fetchStaffList(activeId);
          setStaffList(staff || []);
        } catch (staffErr) {
          console.warn('Failed to load staff list (non-critical):', staffErr);
        }
      }

      setLoadError(null);
    } catch (err) {
      console.error('Settings load error:', err);
      const msg = err.message || 'Failed to load venue settings';
      if (msg.includes('schema cache') || msg.includes('relation') || msg.includes('does not exist')) {
        setLoadError(
          'Supabase schema cache needs to be refreshed. Go to Supabase Dashboard → Settings → API → click "Reload Schema Cache", then retry.'
        );
      } else {
        setLoadError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ─── Save Handlers ─────────────────────────────────────────────────────────

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const activeId = venueId || venueData.id;
      await updateVenue(activeId, {
        name: venueData.name,
        slug: venueData.slug,
        brand_color: venueData.brand_color,
        logo_url: venueData.logo_url,
      });
      updateBrandColor(venueData.brand_color);
      toast.success('Branding saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const activeId = venueId || venueData.id;
      await updateVenue(activeId, {
        address: venueData.address,
        phone: venueData.phone,
        currency: venueData.currency,
        tax_rate: parseFloat(venueData.tax_rate),
      });
      await updateVenueSettings(activeId, {
        gstin: settingsData.gstin,
        fssai_number: settingsData.fssai_number,
        allow_guest_ordering: settingsData.allow_guest_ordering,
        require_guest_phone: settingsData.require_guest_phone,
        enable_sound_alerts: settingsData.enable_sound_alerts,
      });
      toast.success('Business details saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save details');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Staff Actions ──────────────────────────────────────────────────────────

  const handleInviteStaff = async (formData) => {
    setIsInviting(true);
    try {
      const activeId = venueId || venueData.id;
      const { tempPassword } = await inviteStaff({
        venueId: activeId,
        orgId,
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
      });
      setLastTempPassword(tempPassword);
      toast.success('Staff member invited');
      setInviteModalOpen(false);
      const staff = await fetchStaffList(venueId);
      setStaffList(staff);
    } catch (err) {
      toast.error(err.message || 'Failed to invite staff');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (staffId, newRole) => {
    try {
      await updateStaffRole(staffId, newRole);
      toast.success('Role updated');
      const staff = await fetchStaffList(venueId);
      setStaffList(staff);
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleDeactivate = async (staffId, name) => {
    if (!window.confirm(`Deactivate ${name}? They will lose access to this venue.`)) return;
    try {
      await deactivateStaff(staffId);
      toast.success('Staff member deactivated');
      const staff = await fetchStaffList(venueId);
      setStaffList(staff);
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate');
    }
  };

  const handleVenueField = (field) => (e) => {
    setVenueData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleColorChange = (e) => {
    const val = e.target.value;
    setVenueData((prev) => ({ ...prev, brand_color: val }));
    updateBrandColor(val);
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Venue Settings</h2>
          <p className="text-xs text-stone-500">Loading settings...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Venue Settings</h2>
          <p className="text-xs text-stone-500">Configure branding, business details, and staff access</p>
        </div>
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Settings Load Error
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {loadError}
              </p>
            </div>
          </div>
          <Button onClick={loadAllData} size="sm">
            <ArrowPathIcon className="h-4 w-4" /> Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white">
          Venue Settings
        </h2>
        <p className="text-xs text-stone-500">
          Configure branding, business details, and staff access
        </p>
      </div>

      <Tabs tabs={TAB_LIST} activeTab={activeTab} onChange={setActiveTab} />

      {/* ─── Branding Tab ─── */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Brand Identity & Theme
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Customize your restaurant name, customer ordering URL, and custom brand theme color.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Restaurant / Venue Name"
                value={venueData.name}
                onChange={handleVenueField('name')}
                placeholder="e.g. Spice Garden Downtown"
                required
              />
              <div>
                <Input
                  label="URL Slug (Custom Link)"
                  value={venueData.slug}
                  onChange={handleVenueField('slug')}
                  placeholder="e.g. spice-garden"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1 font-mono">
                  <span>Guest URL:</span>
                  <span className="text-brand-primary font-semibold">
                    /t/{'{table_code}'}
                  </span>
                </p>
              </div>
            </div>

            {/* Logo URL + Live Logo Preview */}
            <div className="space-y-2">
              <Input
                label="Logo Image URL"
                value={venueData.logo_url}
                onChange={handleVenueField('logo_url')}
                placeholder="https://example.com/logo.png"
                helperText="Enter direct URL to your PNG, SVG, or JPEG logo."
              />
              {venueData.logo_url && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/60 max-w-md">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-stone-900 p-1 flex items-center justify-center border border-stone-200 dark:border-stone-700 overflow-hidden shadow-xs shrink-0">
                    <img
                      src={venueData.logo_url}
                      alt="Venue Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">
                      Live Logo Preview
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Active on customer digital menus & bills
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Color & Presets */}
            <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                Brand Accent Color
              </label>

              {/* Color Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { name: 'Warm Orange', hex: '#EA580C' },
                  { name: 'Crimson Red', hex: '#E11D48' },
                  { name: 'Amber Flame', hex: '#D97706' },
                  { name: 'Royal Indigo', hex: '#4F46E5' },
                  { name: 'Fresh Emerald', hex: '#059669' },
                  { name: 'Midnight Slate', hex: '#0F172A' },
                ].map((preset) => {
                  const isSelected =
                    venueData.brand_color?.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => {
                        setVenueData((p) => ({ ...p, brand_color: preset.hex }));
                        updateBrandColor(preset.hex);
                      }}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-stone-900 dark:border-white bg-stone-100 dark:bg-stone-800 shadow-xs'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/60 hover:border-stone-400'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-stone-700 dark:text-stone-300">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Picker Controls */}
              <div className="flex items-center gap-3 pt-2">
                <div className="relative">
                  <input
                    type="color"
                    id="brand-color-picker"
                    value={venueData.brand_color || '#EA580C'}
                    onChange={handleColorChange}
                    className="h-10 w-10 rounded-xl cursor-pointer border border-stone-200 dark:border-stone-700 p-0.5 bg-transparent"
                  />
                </div>
                <div className="w-36">
                  <Input
                    value={venueData.brand_color || '#EA580C'}
                    onChange={handleColorChange}
                    placeholder="#EA580C"
                  />
                </div>
              </div>
            </div>

            {/* Live Component Preview Showcase */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-3">
                Live Customer UI Preview
              </span>
              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200/80 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: venueData.brand_color || '#EA580C' }}
                  >
                    {(venueData.name || 'V').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-black text-stone-900 dark:text-white block">
                      {venueData.name || 'Restaurant Name'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Smart QR Digital Ordering
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Promo Badge */}
                  <span
                    style={{
                      backgroundColor: `${venueData.brand_color || '#EA580C'}18`,
                      color: venueData.brand_color || '#EA580C',
                      borderColor: `${venueData.brand_color || '#EA580C'}35`,
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border"
                  >
                    <TagIcon className="h-3.5 w-3.5" /> Flat 20% OFF
                  </span>

                  {/* Primary Button */}
                  <button
                    type="button"
                    style={{ backgroundColor: venueData.brand_color || '#EA580C' }}
                    className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5 cursor-default"
                  >
                    <SparklesIcon className="h-4 w-4" /> View Menu & Order
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="lg" isLoading={isSaving} className="font-bold px-8">
              Save Branding Changes
            </Button>
          </div>
        </form>
      )}

      {/* ─── Business Details Tab ─── */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Location & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Address"
                value={venueData.address}
                onChange={handleVenueField('address')}
              />
              <Input
                label="Phone Number"
                value={venueData.phone}
                onChange={handleVenueField('phone')}
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Tax & Legal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="GSTIN"
                value={settingsData.gstin}
                onChange={(e) =>
                  setSettingsData((p) => ({ ...p, gstin: e.target.value }))
                }
              />
              <Input
                label="FSSAI License Number"
                value={settingsData.fssai_number}
                onChange={(e) =>
                  setSettingsData((p) => ({ ...p, fssai_number: e.target.value }))
                }
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.01"
                value={venueData.tax_rate}
                onChange={handleVenueField('tax_rate')}
              />
              <Input
                label="Currency"
                value={venueData.currency}
                onChange={handleVenueField('currency')}
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Ordering Preferences
            </h3>
            <Toggle
              checked={settingsData.allow_guest_ordering}
              onChange={(val) =>
                setSettingsData((p) => ({ ...p, allow_guest_ordering: val }))
              }
              label="Allow QR Guest Ordering"
              description="When off, guests can only view the menu but cannot place orders."
            />
            <Toggle
              checked={settingsData.require_guest_phone}
              onChange={(val) =>
                setSettingsData((p) => ({ ...p, require_guest_phone: val }))
              }
              label="Require Guest Phone Number"
              description="Guests must enter their phone before placing an order (for loyalty tracking)."
            />
            <Toggle
              checked={settingsData.enable_sound_alerts}
              onChange={(val) =>
                setSettingsData((p) => ({ ...p, enable_sound_alerts: val }))
              }
              label="New Order Sound Alerts"
              description="Play an audio alert when a new order arrives on the Live Orders page."
            />
          </div>

          <Button type="submit" isLoading={isSaving}>
            Save Business Details
          </Button>
        </form>
      )}

      {/* ─── Staff Management Tab ─── */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Team Members ({staffList.length})
            </h3>
            {(myRole === 'owner' || myRole === 'manager') && (
              <Button
                size="sm"
                onClick={() => setInviteModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4" /> Invite Staff
              </Button>
            )}
          </div>

          {/* Temporary Password Callout */}
          {lastTempPassword && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Staff member created! Temporary password:
              </p>
              <code className="block text-sm font-mono bg-white dark:bg-stone-900 px-3 py-2 rounded-lg border text-stone-900 dark:text-white select-all">
                {lastTempPassword}
              </code>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Share this securely. The staff member should change it after their first login.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLastTempPassword(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Staff Table */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 dark:border-stone-800 text-left">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Name</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Email</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Role</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Status</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {staffList.length > 0 ? (
                  staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-200">
                            {(s.full_name || 'S').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-stone-900 dark:text-white">
                            {s.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-500">{s.email}</td>
                      <td className="px-5 py-3">
                        {myRole === 'owner' && s.role !== 'owner' ? (
                          <Select
                            value={s.role}
                            onChange={(e) => handleRoleChange(s.id, e.target.value)}
                            options={ROLE_OPTIONS.filter((o) => o.value !== 'owner')}
                            className="!py-1.5 !text-xs max-w-[120px]"
                          />
                        ) : (
                          <Badge
                            variant={s.role === 'owner' ? 'primary' : 'default'}
                            size="sm"
                          >
                            {s.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={s.is_active ? 'success' : 'danger'}
                          size="sm"
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {s.role !== 'owner' && s.is_active && myRole === 'owner' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-600"
                            onClick={() => handleDeactivate(s.id, s.full_name)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-5 py-8 text-center text-xs text-stone-500">
                      No staff members found for this venue. Invite your first team member above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <StaffInviteModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            onInvite={handleInviteStaff}
            isLoading={isInviting}
          />
        </div>
      )}
    </div>
  );
}
