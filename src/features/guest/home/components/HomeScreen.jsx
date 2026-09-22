import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  QrCodeIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BellAlertIcon,
  UsersIcon,
  DocumentCheckIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export function HomeScreen() {
  const [tableCodeInput, setTableCodeInput] = useState('');
  const navigate = useNavigate();

  const handleTableLookup = (e) => {
    e.preventDefault();
    if (!tableCodeInput.trim()) return;
    navigate(`/t/${tableCodeInput.trim().toUpperCase()}`);
  };

  const features = [
    {
      title: 'Digital QR Table Ordering',
      description: 'Guests scan the table QR code to browse high-res menus, customize dishes, and place multi-round orders instantly.',
      icon: QrCodeIcon,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Live Kitchen Display (KDS)',
      description: 'Stream incoming orders to kitchen stations (Hot, Cold, Bar) in real-time with one-click status updates for chefs.',
      icon: ComputerDesktopIcon,
      color: 'text-rose-500 bg-rose-500/10',
    },
    {
      title: 'Floor & Table Management',
      description: 'Monitor real-time table occupancy, generate branded acrylic standees, and settle multi-round bills effortlessly.',
      icon: DocumentCheckIcon,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'PetPooja-Style Staff Ops',
      description: 'Manage floor crew, kitchen attendants, and managers with live shift status, online presence, and order metrics.',
      icon: UsersIcon,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'Push Notification CRM',
      description: 'Target dining guests with native web push notifications for flash discounts, happy hours, and festive coupons.',
      icon: BellAlertIcon,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      title: 'Bank-Grade Security & Isolation',
      description: 'Multi-tenant architecture powered by PostgreSQL Row-Level Security ensures 100% data isolation per venue.',
      icon: ShieldCheckIcon,
      color: 'text-teal-500 bg-teal-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="flex items-center justify-between z-10 max-w-6xl mx-auto w-full px-6 py-6 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-primary to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-primary/30">
            TS
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight">TableSuite</h1>
            <p className="text-xs text-stone-400">Cloud Restaurant Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button size="sm" variant="outline" className="border-stone-700 text-stone-300 hover:text-white">
              Staff Sign In
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-brand-primary font-bold shadow-md shadow-brand-primary/25">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto w-full px-6 my-16 z-10 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="accent" size="lg" className="mx-auto border border-brand-primary/30 bg-brand-primary/10 text-brand-primary">
            <SparklesIcon className="h-4 w-4 mr-1.5 inline" /> Modern Dining Platform for Restaurants & Cafés
          </Badge>

          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Elevate Dining with <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-amber-400 to-orange-500">
              Smart QR Ordering & POS
            </span>
          </h2>

          <p className="text-sm sm:text-base text-stone-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate ordering friction, boost table turnover by 35%, and delight diners with live kitchen tracking, automated GST billing, and push CRM.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-brand-primary font-bold shadow-lg shadow-brand-primary/30 gap-2">
                Launch Restaurant Portal <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Table Lookup for Guests */}
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-2xl text-center space-y-4">
          <div className="h-10 w-10 mx-auto rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <DevicePhoneMobileIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Dining at a Restaurant?</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Enter the 6-character code printed on your table standee to browse the menu:
            </p>
          </div>

          <form onSubmit={handleTableLookup} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TBL001"
              value={tableCodeInput}
              onChange={(e) => setTableCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              className="flex-1 rounded-xl border border-stone-700 bg-stone-800/80 px-4 py-2.5 text-xs text-white uppercase tracking-wider font-mono placeholder:text-stone-500 focus:border-brand-primary focus:outline-none"
            />
            <Button type="submit" size="md" className="font-bold">
              Open Menu
            </Button>
          </form>
        </div>

        {/* Feature Grid */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Everything Your Restaurant Needs in One OS
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Built from the ground up for high-volume dining operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-stone-900/60 border border-stone-800 hover:border-stone-700 hover:bg-stone-900/90 transition-all space-y-3 shadow-md"
                >
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${f.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{f.title}</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-8 border-t border-stone-900 text-center text-xs text-stone-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>TableSuite &copy; {new Date().getFullYear()} &bull; All rights reserved.</p>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/login" className="hover:text-white transition-colors">
            Staff Portal
          </Link>
          <span className="text-stone-700">&bull;</span>
          <span className="text-stone-400">Enterprise PostgreSQL RLS</span>
        </div>
      </footer>
    </div>
  );
}
