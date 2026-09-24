import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ease = [0.22, 1, 0.36, 1];

export function FinalCtaSection() {
  return (
    <section id="cta" className="w-full relative z-10 py-16 md:py-24">
      {/* Big, Bold, Full-Width Rounded Panel */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease }}
        className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden border border-white/[0.12] bg-[#0A0C11] p-10 sm:p-16 md:p-20 text-center space-y-8 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {/* Background 1: Line Grid Pattern */}
        <div className="faint-grid pointer-events-none opacity-40 absolute inset-0 -z-0" />

        {/* Background 2: Soft Accent Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] bg-accent/[0.08] rounded-full blur-[140px] pointer-events-none -z-0" />

        {/* Background 3: Slow Subtle Marquee Pattern */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 overflow-hidden pointer-events-none opacity-10 mask-fade-edges select-none -z-0">
          <div className="animate-marquee flex items-center gap-8 font-mono text-5xl sm:text-7xl font-extrabold uppercase tracking-widest text-white whitespace-nowrap">
            <span>AUTONOMOUS DINING</span>
            <span>&bull;</span>
            <span>SUB-SECOND KDS</span>
            <span>&bull;</span>
            <span>CONTACTLESS SETTLEMENT</span>
            <span>&bull;</span>
            <span>ZERO APP DOWNLOAD</span>
            <span>&bull;</span>
            <span>AUTONOMOUS DINING</span>
            <span>&bull;</span>
            <span>SUB-SECOND KDS</span>
            <span>&bull;</span>
            <span>CONTACTLESS SETTLEMENT</span>
            <span>&bull;</span>
            <span>ZERO APP DOWNLOAD</span>
            <span>&bull;</span>
          </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
          {/* Eyebrow Label */}
          <div className="inline-flex">
            <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-surface/80 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              <span>START OPERATING SMARTER</span>
            </div>
          </div>

          {/* Huge Headline */}
          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] text-text tracking-[-0.035em] leading-[1.02]">
            Ready to Elevate Your Dining Operations?
          </h2>

          {/* Muted Subheading */}
          <p className="text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed font-sans">
            Eliminate ordering friction, boost table turnover by 35%, and delight diners with live kitchen tracking, automated GST billing, and push CRM.
          </p>

          {/* Existing Buttons as Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-full bg-accent text-bg font-semibold hover:bg-accent-hover px-8 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 gap-2.5"
                rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
              >
                Launch Restaurant Portal
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto rounded-full border border-white/15 bg-white/[0.04] text-text hover:border-white/30 hover:bg-white/[0.08] px-8 py-3.5 transition-all duration-300 hover:-translate-y-0.5"
              >
                Staff Sign In
              </Button>
            </Link>
          </div>

          {/* Micro Guarantee Note */}
          <p className="font-mono text-[11px] text-muted/70 pt-2">
            Instant 15-minute setup &bull; Zero hardware dependency &bull; Cancel anytime
          </p>
        </div>
      </motion.div>
    </section>
  );
}
