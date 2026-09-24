import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Github,
  Twitter,
  Linkedin,
  Instagram,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Server,
  Layers,
  Lock,
  ExternalLink,
} from 'lucide-react';

const socials = [
  { name: 'GitHub', icon: Github, href: 'https://github.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
];

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleNavClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      if (location.pathname !== '/') {
        navigate('/' + href);
        return;
      }
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior = prefersReduced ? 'auto' : 'smooth';
      if (href === '#hero' || href === '#') {
        window.scrollTo({ top: 0, behavior });
      } else {
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' });
        }
      }
    }
  };

  const platformLinks = [
    { label: 'Digital QR Ordering', href: '#features' },
    { label: 'Live Kitchen KDS', href: '#features' },
    { label: 'Waiter Dispatch Engine', href: '#features' },
    { label: 'Multi-Round Tab Memory', href: '#process' },
    { label: 'Table Lookup Terminal', href: '#table-lookup' },
    { label: 'Dynamic Menu Analytics', href: '#features' },
  ];

  const infrastructureLinks = [
    { label: 'Enterprise PostgreSQL RLS', href: '#about', isKeyFeature: true },
    { label: 'Sub-120ms KDS Pipeline', href: '#about' },
    { label: 'Real-Time Supabase Sync', href: '#about' },
    { label: 'Hardware ESC/POS Gateway', href: '#features' },
    { label: 'Offline State Queues', href: '#process' },
    { label: 'SOC 2 Type II Security', href: '#about' },
  ];

  const companyLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'System Features', href: '#features' },
    { label: 'Kitchen Process', href: '#process' },
    { label: 'Client Case Studies', href: '#projects' },
    { label: 'Pricing Plans', href: '#pricing' },
    { label: 'Operator Reviews', href: '#testimonials' },
    { label: 'About & Leadership', href: '#about' },
    { label: 'Direct Enterprise Contact', href: '#contact' },
  ];

  const portalLinks = [
    { label: 'Staff Portal', href: '/login', isRoute: true },
    { label: 'Staff Sign In', href: '/login', isRoute: true },
    { label: 'Floor Manager Console', href: '/login', isRoute: true },
    { label: 'Kitchen Display Station', href: '/login', isRoute: true },
    { label: 'Table Code Lookup', href: '#table-lookup' },
    { label: 'System Architecture', href: '#about' },
  ];

  return (
    <footer className="relative z-10 w-full bg-[#07080B] border-t border-white/[0.08] overflow-hidden">
      {/* Hairline subtle top light-accent trace */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* Main Multi-Column Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand & Overview Column (Spans 2 columns on large screens) */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-6">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
                }
              }}
              className="inline-flex items-center gap-3.5 group shrink-0"
            >
              <div className="h-9 w-9 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-accent font-heading font-extrabold text-sm tracking-tight shadow-sm transition-transform duration-200 ease-cinematic group-hover:scale-105">
                TS
              </div>
              <div>
                <span className="font-heading font-extrabold text-base text-text tracking-tight leading-none group-hover:text-white transition-colors block">
                  TableSuite
                </span>
                <span className="text-[11px] text-muted font-mono tracking-wider uppercase mt-1 block">
                  Cloud Restaurant Operating System
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted leading-relaxed font-sans max-w-sm">
              Enterprise QR table ordering, sub-120ms kitchen display engine, and high-velocity hospitality management. Designed for mission-critical dining operations.
            </p>

            {/* Live Operational Status */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="font-mono text-[11px] text-text/80 tracking-wide">
                All Systems Operational &bull; 99.98% SLA
              </span>
            </div>

            {/* Socials as small bordered circular icon buttons */}
            <div className="pt-2">
              <p className="font-mono text-[11px] text-muted/60 uppercase tracking-widest mb-3">
                Connect
              </p>
              <div className="flex items-center gap-2.5">
                {socials.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                      className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.08] flex items-center justify-center text-muted hover:text-white transition-all duration-200 group"
                    >
                      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text/90">
              Platform
            </h4>
            <ul className="space-y-1.5">
              {platformLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="group relative inline-flex items-center text-xs text-muted hover:text-white transition-colors duration-200 py-1.5 min-h-[32px] w-fit"
                  >
                    <span className="relative">
                      {item.label}
                      <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Infrastructure & Security */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text/90">
              Architecture
            </h4>
            <ul className="space-y-1.5">
              {infrastructureLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="group relative inline-flex items-center text-xs text-muted hover:text-white transition-colors duration-200 py-1.5 min-h-[32px] w-fit"
                  >
                    <span className="relative">
                      {item.label}
                      <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Explore */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text/90">
              Navigation
            </h4>
            <ul className="space-y-1.5">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="group relative inline-flex items-center text-xs text-muted hover:text-white transition-colors duration-200 py-1.5 min-h-[32px] w-fit"
                  >
                    <span className="relative">
                      {item.label}
                      <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Portals & Access */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text/90">
              Portals
            </h4>
            <ul className="space-y-1.5">
              {portalLinks.map((item) => (
                <li key={item.label}>
                  {item.isRoute ? (
                    <Link
                      to={item.href}
                      className="group relative inline-flex items-center text-xs text-muted hover:text-white transition-colors duration-200 py-1.5 min-h-[32px] w-fit"
                    >
                      <span className="relative">
                        {item.label}
                        <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
                      </span>
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className="group relative inline-flex items-center text-xs text-muted hover:text-white transition-colors duration-200 py-1.5 min-h-[32px] w-fit"
                    >
                      <span className="relative">
                        {item.label}
                        <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sub-Footer Divider & Status Row */}
      <div className="border-t border-white/[0.08] max-w-7xl mx-auto px-6 md:px-10 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted font-mono">
          <p className="flex items-center gap-2">
            <span>TableSuite &copy; {currentYear} &bull; All rights reserved.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/login"
              className="group relative inline-flex items-center text-muted hover:text-white transition-colors duration-200 py-0.5"
            >
              <span className="relative">
                Staff Portal
                <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full" />
              </span>
            </Link>

            <span className="text-white/20">&bull;</span>

            <div className="flex items-center gap-1.5 text-text/70">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>Enterprise PostgreSQL RLS</span>
            </div>

            <span className="text-white/20">&bull;</span>

            <span className="text-muted/60">Distributed Cloud POS</span>
          </div>
        </div>
      </div>

      {/* Very Large Low-Opacity Brand Wordmark across the bottom */}
      <div className="w-full overflow-hidden select-none pointer-events-none border-t border-white/[0.04] pt-6 pb-2 sm:pt-8 sm:pb-3 flex justify-center items-center">
        <span className="font-heading font-black tracking-tighter uppercase text-[13.5vw] sm:text-[14.5vw] md:text-[15.5vw] leading-[0.8] text-center whitespace-nowrap bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-transparent bg-clip-text text-transparent">
          TABLESUITE
        </span>
      </div>
    </footer>
  );
}

export default Footer;
