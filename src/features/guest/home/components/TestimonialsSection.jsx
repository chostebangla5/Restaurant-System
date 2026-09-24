import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles, CheckCircle2 } from 'lucide-react';

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


export function TestimonialsSection() {
  const testimonials = [
    {
      id: 'vikram-singhania',
      quote:
        'TableSuite transformed our floor operations overnight. Diners order drinks and starters within 45 seconds of sitting down, and our multi-round table turnover increased by 38% without our servers feeling rushed.',
      name: 'Vikram Singhania',
      role: 'Managing Director',
      venue: 'The Copper Chimney Group',
      metric: '+38% Table Velocity',
      avatar: 'VS',
      column: 1,
    },
    {
      id: 'elena-rostova',
      quote:
        'The morning peak rush used to cause 15-minute counter queues. With TableSuite’s QR ordering and barista station dispatch, our queue times evaporated and beverage throughput grew by 52% across all three locations.',
      name: 'Elena Rostova',
      role: 'Founder & Head of Operations',
      venue: 'Roast & Brew Roasteries',
      metric: '52% Throughput Lift',
      avatar: 'ER',
      column: 2,
    },
    {
      id: 'marcus-chen',
      quote:
        'The sub-second KDS routing to our wok and sushi stations eliminated order lost-in-translation issues completely. The kitchen prep timers give our line chefs complete clarity during dinner service.',
      name: 'Chef Marcus Chen',
      role: 'Culinary Director',
      venue: 'Bao House Hospitality',
      metric: 'Sub-Second KDS Dispatch',
      avatar: 'MC',
      column: 1,
    },
    {
      id: 'aarav-mehta',
      quote:
        'Split billing and instant contactless UPI settlement resolved our biggest bottleneck at 1:00 AM. Guests settle and depart in seconds, leaving our floor crew free to focus entirely on hospitality.',
      name: 'Aarav Mehta',
      role: 'General Manager',
      venue: 'Velvet Rooftop & Lounge',
      metric: 'Instant Contactless Settle',
      avatar: 'AM',
      column: 2,
    },
    {
      id: 'devika-nair',
      quote:
        'PostgreSQL row-level isolation and enterprise role-based permissions gave our multi-venue ownership group complete peace of mind. TableSuite is the cleanest restaurant OS we have ever deployed.',
      name: 'Devika Nair',
      role: 'Director of Technology',
      venue: 'Artisan Dine Collective',
      metric: 'Bank-Grade Isolation',
      avatar: 'DN',
      column: 1,
    },
    {
      id: 'julian-vance',
      quote:
        'Our diners love having zero app downloads. They scan, customize dish add-ons with rich photos, and the orders hit our prep station display before the server can even walk back to the pass.',
      name: 'Julian Vance',
      role: 'Food & Beverage Director',
      venue: 'The Grandview Bistro',
      metric: 'Zero App Download',
      avatar: 'JV',
      column: 2,
    },
  ];

  const col1 = testimonials.filter((t) => t.column === 1);
  const col2 = testimonials.filter((t) => t.column === 2);

  return (
    <section id="testimonials" className="w-full relative z-10 py-16 md:py-24 space-y-16">
      {/* Section Header */}
      <div className="space-y-3 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>OPERATOR TESTIMONIALS</span>
        </div>
        <h2 className="h2-cinematic text-text">
          Trusted by High-Volume Venues
        </h2>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          See how premier culinary directors, hospitality operators, and general managers streamline dining with TableSuite.
        </p>
      </div>

      {/* Staggered Two-Column Layout */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
      >
        {/* Column 1 */}
        <div className="space-y-6 lg:space-y-8">
          {col1.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              className="card-surface rounded-card border border-white/[0.08] hover:border-white/20 p-8 sm:p-10 transition-all duration-200 ease-cinematic relative flex flex-col justify-between space-y-7 group"
            >
              {/* Card Header: Refined Quote Icon & Micro Metric Pill */}
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.03] text-accent flex items-center justify-center">
                  <Quote className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.02]">
                  <CheckCircle2 className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  <span>{item.metric}</span>
                </div>
              </div>

              {/* Large Quote Typographic Style (18-22px, light) */}
              <p className="font-sans font-light text-base sm:text-lg md:text-[1.2rem] text-text/90 leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author Row: Avatar Ring, Name & Role in Small Muted Text */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-white/[0.06]">
                <div className="h-11 w-11 rounded-full p-[2px] border border-white/15 group-hover:border-accent/40 bg-surface-2 transition-colors flex items-center justify-center shrink-0">
                  <div className="h-full w-full rounded-full bg-white/[0.04] flex items-center justify-center font-mono font-bold text-xs text-accent">
                    {item.avatar}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-heading font-semibold text-sm sm:text-base text-text tracking-tight group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  <p className="font-sans text-xs text-muted">
                    {item.role} &bull; <span className="text-muted/70">{item.venue}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Column 2 (Staggered with md:pt-10) */}
        <div className="space-y-6 lg:space-y-8 md:pt-10">
          {col2.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              className="card-surface rounded-card border border-white/[0.08] hover:border-white/20 p-8 sm:p-10 transition-all duration-200 ease-cinematic relative flex flex-col justify-between space-y-7 group"
            >
              {/* Card Header: Refined Quote Icon & Micro Metric Pill */}
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.03] text-accent flex items-center justify-center">
                  <Quote className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.02]">
                  <CheckCircle2 className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  <span>{item.metric}</span>
                </div>
              </div>

              {/* Large Quote Typographic Style (18-22px, light) */}
              <p className="font-sans font-light text-base sm:text-lg md:text-[1.2rem] text-text/90 leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author Row: Avatar Ring, Name & Role in Small Muted Text */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-white/[0.06]">
                <div className="h-11 w-11 rounded-full p-[2px] border border-white/15 group-hover:border-accent/40 bg-surface-2 transition-colors flex items-center justify-center shrink-0">
                  <div className="h-full w-full rounded-full bg-white/[0.04] flex items-center justify-center font-mono font-bold text-xs text-accent">
                    {item.avatar}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-heading font-semibold text-sm sm:text-base text-text tracking-tight group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  <p className="font-sans text-xs text-muted">
                    {item.role} &bull; <span className="text-muted/70">{item.venue}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
