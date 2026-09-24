import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import {
  TRANSITION_EASE,
  DURATION_ITEM,
  VIEWPORT_CONFIG,
  containerVariants,
} from '@/lib/motion';

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_ITEM,
      ease: TRANSITION_EASE,
    },
  },
};


export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('annual');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      featured: false,
      badge: null,
      priceMonthly: '₹2,999',
      priceAnnual: '₹2,499',
      period: '/month',
      billedNote: 'Billed annually or ₹2,999/mo',
      description:
        'Essential digital QR ordering and table management for independent cafés and boutique bistros.',
      features: [
        'Up to 15 table QR standees',
        'Instant smartphone digital menu',
        'Multi-round cart & live ordering',
        'Single kitchen station display (KDS)',
        'Daily GST sales & billing summary',
        'Standard email support',
      ],
      ctaText: 'Get Started with Starter',
      ctaLink: '/login',
    },
    {
      id: 'professional',
      name: 'Professional',
      featured: true,
      badge: 'MOST POPULAR',
      priceMonthly: '₹5,999',
      priceAnnual: '₹4,999',
      period: '/month',
      billedNote: 'Billed annually or ₹5,999/mo',
      description:
        'Complete dining operating system for high-volume restaurants, multi-floor venues, and lounges.',
      features: [
        'Unlimited table QR codes & zones',
        'Multi-station KDS routing (Hot, Cold, Bar)',
        'PetPooja-style staff shift & presence ops',
        'Dynamic split billing & UPI fast settlement',
        'Push notification CRM for diners',
        'Dedicated 24/7 priority support & SLAs',
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaLink: '/login',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      featured: false,
      badge: null,
      priceMonthly: 'Custom',
      priceAnnual: 'Custom',
      period: '',
      billedNote: 'Bespoke volume agreement',
      description:
        'Multi-tenant architecture with custom integrations, dedicated infrastructure, and enterprise SLAs.',
      features: [
        'Multi-venue central management console',
        'PostgreSQL RLS strict tenant isolation',
        'Custom POS & legacy hardware bridge',
        'Dedicated technical account manager',
        'Custom domain & white-label standees',
        'Enterprise 99.99% uptime guarantee',
      ],
      ctaText: 'Contact Enterprise Sales',
      ctaLink: '/login',
    },
  ];

  return (
    <section id="pricing" className="w-full relative z-10 py-16 md:py-24 space-y-16">
      {/* Section Header */}
      <div className="space-y-4 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>TRANSPARENT PRICING</span>
        </div>
        <h2 className="h2-cinematic text-text">
          Predictable Plans for Modern Venues
        </h2>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          No hidden transaction cuts, no per-order commissions. Transparent pricing that scales with your tables.
        </p>

        {/* Monthly / Annual Billing Toggle */}
        <div className="pt-2 flex items-center justify-start md:justify-center">
          <div className="inline-flex items-center p-1 rounded-full border border-white/10 bg-surface-2">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 min-h-[38px] rounded-full font-mono text-xs touch-manipulation transition-colors duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-muted hover:text-text'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 min-h-[38px] rounded-full font-mono text-xs touch-manipulation transition-colors duration-200 flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-accent text-bg font-bold'
                  : 'text-muted hover:text-text'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg/20 uppercase tracking-tight">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Responsive Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch"
      >
        {plans.map((plan) => {
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              className={`relative card-surface rounded-card p-8 sm:p-10 transition-all duration-200 ease-cinematic flex flex-col justify-between space-y-8 ${
                plan.featured
                  ? 'border border-accent/60 bg-surface shadow-[0_0_35px_rgba(198,255,61,0.06)]'
                  : 'border border-white/[0.08] hover:border-white/20 bg-surface'
              }`}
            >
              {/* Top Plan Info */}
              <div className="space-y-6">
                {/* Plan Header & Small Pill Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted uppercase tracking-wider">
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 font-mono text-[10px] text-accent font-semibold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                      <span>{plan.badge}</span>
                    </div>
                  )}
                </div>

                {/* Large Price Number */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading font-extrabold text-4xl sm:text-5xl text-text tracking-tight">
                      {price}
                    </span>
                    {plan.period && (
                      <span className="font-mono text-xs text-muted tracking-normal">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted/70">
                    {plan.billedNote}
                  </p>
                </div>

                {/* Plan Description */}
                <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed pt-2 border-t border-white/[0.06]">
                  {plan.description}
                </p>

                {/* Feature List */}
                <div className="space-y-3.5 pt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text/80 block">
                    Included capabilities:
                  </span>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {/* Check icons: muted for standard plans, accent for featured plan */}
                        <div className="pt-0.5 shrink-0">
                          {plan.featured ? (
                            <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />
                          ) : (
                            <Check className="h-4 w-4 text-muted/60" strokeWidth={2} />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-text/80 font-sans leading-snug">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Full-Width Primary Button */}
              <div className="pt-4">
                <Link to={plan.ctaLink} className="block w-full">
                  <Button
                    size="lg"
                    className={`w-full rounded-full font-semibold transition-all duration-300 py-3.5 ${
                      plan.featured
                        ? 'bg-accent text-bg hover:bg-accent-hover shadow-sm'
                        : 'border border-white/15 bg-surface-2 hover:bg-white/[0.06] hover:border-white/30 text-text'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                  </Button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
