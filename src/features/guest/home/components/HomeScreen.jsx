import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  QrCode,
  Sparkles,
  Smartphone,
  Monitor,
  Bell,
  Users,
  FileCheck,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/navigation/Footer';
import { HeroVisual } from './HeroVisual';
import { LogosAndStatsStrip } from './LogosAndStatsStrip';
import { ProcessTimeline } from './ProcessTimeline';
import { ProjectsSection } from './ProjectsSection';
import { PricingSection } from './PricingSection';
import { TestimonialsSection } from './TestimonialsSection';
import { AboutSection } from './AboutSection';
import { ContactSection } from './ContactSection';
import { FinalCtaSection } from './FinalCtaSection';

import {
  TRANSITION_EASE,
  DURATION_SECTION,
  DURATION_ITEM,
  VIEWPORT_CONFIG,
  sectionVariants,
  itemVariants,
  containerVariants,
} from '@/lib/motion';

const titleContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const lineVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: {
      duration: DURATION_SECTION,
      ease: TRANSITION_EASE,
    },
  },
};

function BentoCard({ feature, index }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const Icon = feature.icon;
  const numberLabel = String(index + 1).padStart(2, '0');

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      className={`group relative card-surface rounded-card border border-white/[0.08] hover:border-white/25 p-7 sm:p-8 transition-colors duration-200 overflow-hidden flex flex-col justify-between ${feature.span}`}
    >
      {/* Soft cursor-following spotlight inside the card */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-card opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              320px circle at ${mouseX}px ${mouseY}px,
              rgba(198, 255, 61, 0.08),
              transparent 80%
            )
          `,
        }}
      />

      {/* Top row: Number label & Lucide icon in small bordered square, plus hover arrow at top right */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {/* Lucide icon in a small bordered square */}
          <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.03] group-hover:border-white/20 flex items-center justify-center text-accent transition-colors duration-200">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          {/* Small numbered label in mono */}
          <span className="font-mono text-xs text-muted/60 tracking-wider">
            {numberLabel}
          </span>
        </div>

        {/* Small arrow appears at top right on hover */}
        <div className="h-7 w-7 rounded-full border border-white/10 bg-surface-2/70 flex items-center justify-center opacity-0 -translate-x-1.5 translate-y-1.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-200 ease-cinematic text-accent">
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title & Description */}
      <div className="relative z-10 space-y-2.5 pt-8">
        <h4 className="font-heading text-lg sm:text-xl font-bold text-text tracking-tight group-hover:text-white transition-colors duration-200">
          {feature.title}
        </h4>
        <p className="text-sm text-muted leading-relaxed font-sans">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

export function HomeScreen() {
  const [tableCodeInput, setTableCodeInput] = useState('');
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleTableLookup = (e) => {
    e.preventDefault();
    if (!tableCodeInput.trim()) return;
    navigate(`/t/${tableCodeInput.trim().toUpperCase()}`);
  };

  const features = [
    {
      title: 'Digital QR Table Ordering',
      description:
        'Guests scan the table QR code to browse high-res menus, customize dishes, and place multi-round orders instantly.',
      icon: QrCode,
      span: 'md:col-span-2 lg:col-span-7 min-h-[230px]',
    },
    {
      title: 'Live Kitchen Display (KDS)',
      description:
        'Stream incoming orders to kitchen stations (Hot, Cold, Bar) in real-time with one-click status updates for chefs.',
      icon: Monitor,
      span: 'md:col-span-1 lg:col-span-5 min-h-[230px]',
    },
    {
      title: 'Floor & Table Management',
      description:
        'Monitor real-time table occupancy, generate branded acrylic standees, and settle multi-round bills effortlessly.',
      icon: FileCheck,
      span: 'md:col-span-1 lg:col-span-5 min-h-[230px]',
    },
    {
      title: 'PetPooja-Style Staff Ops',
      description:
        'Manage floor crew, kitchen attendants, and managers with live shift status, online presence, and order metrics.',
      icon: Users,
      span: 'md:col-span-2 lg:col-span-7 min-h-[230px]',
    },
    {
      title: 'Push Notification CRM',
      description:
        'Target dining guests with native web push notifications for flash discounts, happy hours, and festive coupons.',
      icon: Bell,
      span: 'md:col-span-1 lg:col-span-6 min-h-[210px]',
    },
    {
      title: 'Bank-Grade Security & Isolation',
      description:
        'Multi-tenant architecture powered by PostgreSQL Row-Level Security ensures 100% data isolation per venue.',
      icon: ShieldCheck,
      span: 'md:col-span-1 lg:col-span-6 min-h-[210px]',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between relative overflow-x-clip pt-16 md:pt-20 font-sans selection:bg-accent selection:text-bg">
      {/* Subtle hero glow & faint grid background */}
      <div className="absolute inset-0 hero-radial-glow faint-grid pointer-events-none opacity-80" />

      {/* Sticky Studio Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 py-6 md:py-10 space-y-24 md:space-y-32">
        {/* Hero Section */}
        <section
          id="hero"
          className="min-h-[calc(100vh-6rem)] flex flex-col justify-center py-12 md:py-16 lg:py-0 relative"
        >
          {/* Soft hero radial glow localized behind editorial content */}
          <div className="absolute -top-16 left-0 w-[550px] h-[450px] bg-accent/[0.045] rounded-full blur-[140px] pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left-Aligned Editorial Column */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-8 text-left">
              {/* Mono Eyebrow Label */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION_SECTION, ease: TRANSITION_EASE }}
                className="inline-flex"
              >
                <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-surface/80 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                  <span>Modern Dining Platform for Restaurants &amp; Cafés</span>
                </div>
              </motion.div>

              {/* Huge H1 with Tight Tracking and Line-by-Line Reveal */}
              <motion.h1
                variants={titleContainerVariants}
                initial="hidden"
                animate="visible"
                className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[5rem] text-text tracking-[-0.035em] leading-[0.98]"
              >
                <span className="block overflow-hidden py-0.5">
                  <motion.span variants={lineVariants} className="block">
                    Elevate Dining with
                  </motion.span>
                </span>
                <span className="block overflow-hidden py-0.5">
                  <motion.span variants={lineVariants} className="block text-text">
                    Smart QR Ordering &amp; POS
                  </motion.span>
                </span>
              </motion.h1>

              {/* Muted Subheading with Max Width of 560px */}
              <motion.p
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION_SECTION, ease: TRANSITION_EASE, delay: 0.12 }}
                className="text-base sm:text-lg text-muted max-w-[560px] leading-relaxed font-sans"
              >
                Eliminate ordering friction, boost table turnover by 35%, and delight diners with live kitchen tracking, automated GST billing, and push CRM.
              </motion.p>

              {/* Existing CTAs as One Primary Pill and One Outline Pill */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION_SECTION, ease: TRANSITION_EASE, delay: 0.18 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
              >
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full bg-accent text-bg font-semibold hover:bg-accent-hover gap-3 px-8 shadow-sm transition-all duration-200 ease-cinematic hover:-translate-y-0.5"
                    rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
                  >
                    Launch Restaurant Portal
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto rounded-full border border-white/15 bg-transparent text-text hover:border-white/30 hover:bg-white/[0.04] px-8 transition-all duration-200 ease-cinematic hover:-translate-y-0.5"
                  >
                    Staff Sign In
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right Column: Tasteful Animated AI Automation Graphic */}
            <div className="lg:col-span-5 xl:col-span-5 hidden lg:block relative pl-4">
              <HeroVisual />
            </div>
          </div>

          {/* Subtle Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: DURATION_SECTION }}
            onClick={() => {
              const el = document.getElementById('table-lookup');
              if (el) {
                el.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
              }
            }}
            className="pt-10 lg:pt-14 inline-flex items-center gap-3 text-muted text-xs font-mono uppercase tracking-widest cursor-pointer group select-none"
          >
            <div className="w-5 h-8 rounded-full border border-white/20 group-hover:border-accent/60 transition-colors duration-200 flex items-start justify-center p-1">
              <motion.div
                animate={shouldReduceMotion ? {} : { y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1 h-1.5 rounded-full bg-accent shadow-[0_0_6px_#C6FF3D]"
              />
            </div>
            <span className="text-[11px] text-muted group-hover:text-text transition-colors duration-200">
              Scroll to explore
            </span>
          </motion.div>
        </section>

        {/* Logos & Stats Strip */}
        <LogosAndStatsStrip />

        {/* Quick Table Lookup for Guests */}
        <motion.section
          id="table-lookup"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          className="max-w-xl mx-auto"
        >
          <div className="card-surface p-8 sm:p-10 border border-white/[0.08] rounded-card text-center space-y-6">
            <div className="h-11 w-11 mx-auto rounded-full bg-white/[0.04] border border-white/10 text-accent flex items-center justify-center">
              <Smartphone className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-bold text-text tracking-tight">
                Dining at a Restaurant?
              </h2>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                Enter the 6-character code printed on your table standee to browse the menu:
              </p>
            </div>

            <form onSubmit={handleTableLookup} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                placeholder="e.g. TBL001"
                value={tableCodeInput}
                onChange={(e) => setTableCodeInput(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 rounded-full border border-white/10 bg-surface-2 px-5 py-3 text-base sm:text-xs text-text uppercase tracking-widest font-mono placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors duration-200"
              />
              <Button type="submit" size="md" className="font-semibold px-6">
                Open Menu
              </Button>
            </form>
          </div>
        </motion.section>

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Bento Grid Feature Section */}
        <motion.section
          id="features"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          className="space-y-12"
        >
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="h2-cinematic text-text">
              Everything Your Restaurant Needs in One OS
            </h2>
            <p className="text-xs sm:text-sm text-muted font-mono uppercase tracking-wider">
              Built from the ground up for high-volume dining operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {features.map((f, idx) => (
              <BentoCard key={idx} feature={f} index={idx} />
            ))}
          </div>
        </motion.section>

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Dining & Kitchen Dispatch Process Timeline */}
        <ProcessTimeline />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Featured Projects & Deployments Showcase */}
        <ProjectsSection />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Transparent Pricing Plans */}
        <PricingSection />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Operator Testimonials */}
        <TestimonialsSection />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* About & Engineering Leadership */}
        <AboutSection />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Direct Contact & Deployments Form */}
        <ContactSection />

        {/* Hairline Divider */}
        <div className="hairline-divider" />

        {/* Final Conversion CTA Panel */}
        <FinalCtaSection />
      </main>

      {/* Restyled Multi-Column Footer with Brand Wordmark */}
      <Footer />
    </div>
  );
}
