import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ease = [0.22, 1, 0.36, 1];

const mobileListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const mobileItemVariants = {
  hidden: { opacity: 0, x: -20, y: 12 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.5,
      ease,
    },
  },
  exit: {
    opacity: 0,
    x: -12,
    y: 8,
    transition: {
      duration: 0.25,
      ease,
    },
  },
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll listener for sticky blur & border transition after 20px of scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll spy to highlight active section on the page
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection(location.pathname);
      return;
    }

    const sections = ['hero', 'table-lookup', 'features', 'process', 'projects', 'pricing', 'testimonials', 'about', 'contact'];
    const handleScrollSpy = () => {
      const scrollY = window.scrollY;
      if (scrollY < 120) {
        setActiveSection('home');
        return;
      }

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 240) {
            setActiveSection(sections[i] === 'hero' ? 'home' : sections[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener('scroll', handleScrollSpy);
  }, [location.pathname]);

  // Prevent background scroll when mobile overlay menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navLinks = [
    { id: 'home', label: 'Home', href: '#hero', route: '/' },
    { id: 'features', label: 'Features', href: '#features', route: '/' },
    { id: 'process', label: 'Process', href: '#process', route: '/' },
    { id: 'projects', label: 'Projects', href: '#projects', route: '/' },
    { id: 'pricing', label: 'Pricing', href: '#pricing', route: '/' },
    { id: 'testimonials', label: 'Testimonials', href: '#testimonials', route: '/' },
    { id: 'about', label: 'About', href: '#about', route: '/' },
    { id: 'contact', label: 'Contact', href: '#contact', route: '/' },
    { id: 'table-lookup', label: 'Table Lookup', href: '#table-lookup', route: '/' },
    { id: 'staff-sign-in', label: 'Staff Sign In', href: '/login', route: '/login', isRoute: true },
  ];

  const handleLinkClick = (e, item) => {
    if (item.isRoute) {
      // Direct route navigation
      return;
    }

    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/' + item.href);
      return;
    }

    if (item.id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.querySelector(item.href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleMobileLinkClick = (e, item) => {
    setMobileOpen(false);
    handleLinkClick(e, item);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#07080B]/85 backdrop-blur-md border-b border-white/[0.08] shadow-sm py-3.5'
            : 'bg-transparent border-b border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          {/* Logo Left */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-3.5 group shrink-0"
          >
            <div className="h-9 w-9 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-accent font-heading font-extrabold text-sm tracking-tight shadow-sm transition-transform duration-300 group-hover:scale-105">
              TS
            </div>
            <div>
              <span className="font-heading font-extrabold text-base text-text tracking-tight leading-none group-hover:text-white transition-colors block">
                TableSuite
              </span>
              <span className="text-[11px] text-muted font-mono tracking-wider uppercase mt-1 hidden sm:block">
                Cloud Restaurant Operating System
              </span>
            </div>
          </Link>

          {/* Centered or Right Desktop Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => {
              const isActive =
                item.isRoute
                  ? location.pathname === item.route
                  : location.pathname === '/' && activeSection === item.id;

              return item.isRoute ? (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`group relative flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-text font-semibold' : 'text-muted hover:text-text'
                  }`}
                >
                  {/* Active-link indicator with a small accent dot */}
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_#C6FF3D] shrink-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative py-1">
                    {item.label}
                    {/* Subtle underline slide on hover */}
                    <span
                      className={`absolute bottom-0 left-0 h-[1.5px] bg-accent transition-all duration-300 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </span>
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item)}
                  className={`group relative flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? 'text-text font-semibold' : 'text-muted hover:text-text'
                  }`}
                >
                  {/* Active-link indicator with a small accent dot */}
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_#C6FF3D] shrink-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative py-1">
                    {item.label}
                    {/* Subtle underline slide on hover */}
                    <span
                      className={`absolute bottom-0 left-0 h-[1.5px] bg-accent transition-all duration-300 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Right Action: Existing CTA as a pill button in the accent color */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button
                size="sm"
                className="bg-accent text-bg font-semibold hover:bg-accent-hover rounded-full px-5 h-9 text-xs transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger Button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-10 w-10 rounded-full border border-white/10 bg-surface-2 text-text flex items-center justify-center hover:border-white/20 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Mobile: Full-screen overlay menu with large staggered links and smooth open/close animation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-nav-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-0 z-50 bg-[#07080B]/95 flex flex-col justify-between p-6 sm:p-10 md:hidden overflow-y-auto"
          >
            {/* Overlay Top Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-accent font-heading font-extrabold text-xs">
                  TS
                </div>
                <div>
                  <span className="font-heading font-bold text-base text-text block leading-none">
                    TableSuite
                  </span>
                  <span className="text-[10px] text-muted font-mono tracking-wider uppercase mt-1 block">
                    Cloud Restaurant OS
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 rounded-full border border-white/10 bg-surface-2 text-muted hover:text-text flex items-center justify-center transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Large Staggered Links */}
            <motion.nav
              variants={mobileListVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-6 my-auto py-10"
            >
              {navLinks.map((item) => {
                const isActive =
                  item.isRoute
                    ? location.pathname === item.route
                    : location.pathname === '/' && activeSection === item.id;

                return (
                  <motion.div key={item.id} variants={mobileItemVariants}>
                    {item.isRoute ? (
                      <Link
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="group inline-flex items-center gap-3.5 text-3xl sm:text-4xl font-heading font-bold text-text hover:text-accent transition-colors"
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_#C6FF3D] shrink-0" />
                        )}
                        <span className="relative">
                          {item.label}
                          <span
                            className={`absolute -bottom-1 left-0 h-[2px] bg-accent transition-all duration-300 ${
                              isActive ? 'w-full' : 'w-0 group-hover:w-full'
                            }`}
                          />
                        </span>
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        onClick={(e) => handleMobileLinkClick(e, item)}
                        className="group inline-flex items-center gap-3.5 text-3xl sm:text-4xl font-heading font-bold text-text hover:text-accent transition-colors"
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_#C6FF3D] shrink-0" />
                        )}
                        <span className="relative">
                          {item.label}
                          <span
                            className={`absolute -bottom-1 left-0 h-[2px] bg-accent transition-all duration-300 ${
                              isActive ? 'w-full' : 'w-0 group-hover:w-full'
                            }`}
                          />
                        </span>
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </motion.nav>

            {/* Bottom Actions */}
            <div className="border-t border-white/[0.08] pt-6 flex flex-col gap-4">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  size="lg"
                  className="w-full rounded-full bg-accent text-bg font-semibold hover:bg-accent-hover text-sm py-4 shadow-md gap-2"
                  rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
                >
                  Get Started
                </Button>
              </Link>
              <p className="text-center text-[11px] font-mono text-muted uppercase tracking-wider">
                Cloud Restaurant Operating System &bull; RLS Protected
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
