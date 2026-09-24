import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import { QrCode, Smartphone, Monitor, CheckCircle2, Sparkles } from 'lucide-react';

import {
  TRANSITION_EASE,
  DURATION_ITEM,
  VIEWPORT_CONFIG,
  containerVariants,
} from '@/lib/motion';

const stepVariants = {
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


export function ProcessTimeline() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 75%', 'end 35%'],
  });

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest < 0.25) setActiveStep(0);
      else if (latest < 0.52) setActiveStep(1);
      else if (latest < 0.8) setActiveStep(2);
      else setActiveStep(3);
    });
  }, [scrollYProgress]);

  const steps = [
    {
      number: '01',
      title: 'Scan Table QR Code',
      description:
        'Guests scan the acrylic table QR code using any smartphone camera with zero app download required.',
      icon: QrCode,
      tag: 'INSTANT INGEST',
    },
    {
      number: '02',
      title: 'Browse & Customize Menu',
      description:
        'Explore rich dish photos, filter dietary preferences, customize add-ons, and place multi-round orders instantly.',
      icon: Smartphone,
      tag: 'MULTI-ROUND CART',
    },
    {
      number: '03',
      title: 'Live Kitchen Dispatch',
      description:
        'Orders route automatically to station display screens (Hot, Cold, Bar) with real-time prep timers for chefs.',
      icon: Monitor,
      tag: 'SUB-SECOND KDS',
    },
    {
      number: '04',
      title: 'Contactless Settlement',
      description:
        'Diners review automated GST invoices and settle seamlessly via UPI, card, or counter cash in one tap.',
      icon: CheckCircle2,
      tag: 'AUTOMATED BILLING',
    },
  ];

  return (
    <section
      id="process"
      ref={containerRef}
      className="w-full relative z-10 py-16 md:py-24 space-y-16"
    >
      {/* Section Header */}
      <div className="space-y-3 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>THE DINING &amp; DISPATCH PIPELINE</span>
        </div>
        <h2 className="h2-cinematic text-text">
          How TableSuite Operates
        </h2>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          From table QR scan to live kitchen routing and settlement in four autonomous steps.
        </p>
      </div>

      {/* Desktop Horizontal Timeline (>= lg) */}
      <div className="hidden lg:block relative pt-8 pb-4">
        {/* Continuous Horizontal Connecting Line that draws on scroll from Node 1 center to Node 4 center */}
        <div className="absolute top-[40px] left-[12.5%] right-[12.5%] h-[1.5px] bg-white/[0.08] -z-0">
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="h-full w-full bg-accent origin-left shadow-[0_0_8px_#C6FF3D]"
          />
        </div>

        {/* 4-Step Horizontal Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          className="grid grid-cols-4 gap-6 relative z-10"
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isReached = activeStep >= idx;
            const isCurrent = activeStep === idx;

            return (
              <motion.div
                key={step.number}
                variants={stepVariants}
                className="group flex flex-col items-center space-y-6"
              >
                {/* Timeline Node on the Line (Centered above column) */}
                <div className="flex items-center justify-center w-full">
                  <div
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ease-cinematic flex items-center justify-center ${
                      isReached
                        ? 'bg-accent border-bg shadow-[0_0_10px_#C6FF3D] ring-4 ring-accent/20'
                        : 'bg-surface-2 border-white/25'
                    }`}
                  >
                    {isCurrent && (
                      <span className="h-1.5 w-1.5 rounded-full bg-bg" />
                    )}
                  </div>
                </div>

                {/* Step Card */}
                <div className="w-full text-left card-surface rounded-card border border-white/[0.08] hover:border-white/20 p-6 space-y-5 transition-all duration-200 ease-cinematic min-h-[270px] flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Large Mono Step Number & Icon */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-4xl sm:text-5xl font-extrabold tracking-tight transition-colors duration-300 ${
                          isReached ? 'text-accent' : 'text-white/20 group-hover:text-white/40'
                        }`}
                      >
                        {step.number}
                      </span>
                      <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-accent">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Step Title & Active Dot Indicator / Tag */}
                    <div className="space-y-1.5">
                      {isCurrent ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent shadow-[0_0_6px_#C6FF3D]" />
                          </span>
                          <span className="font-mono text-[9px] text-accent font-semibold tracking-wider uppercase">
                            Active Step
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted uppercase tracking-wider block">
                          {step.tag}
                        </span>
                      )}
                      <h4 className="font-heading text-lg font-bold text-text tracking-tight group-hover:text-white transition-colors">
                        {step.title}
                      </h4>
                    </div>
                  </div>

                  {/* Step Description */}
                  <p className="text-xs text-muted leading-relaxed font-sans pt-3 border-t border-white/[0.06]">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Mobile Vertical Timeline (< lg) */}
      <div className="block lg:hidden relative pl-6 sm:pl-8">
        {/* Continuous Vertical Spine Line that draws on scroll */}
        <div className="absolute top-6 bottom-6 left-3 sm:left-4 w-[1.5px] bg-white/[0.08] -z-0">
          <motion.div
            style={{ scaleY: scrollYProgress }}
            className="w-full h-full bg-accent origin-top shadow-[0_0_8px_#C6FF3D]"
          />
        </div>

        {/* Vertical Steps List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          className="space-y-8 relative z-10"
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isReached = activeStep >= idx;
            const isCurrent = activeStep === idx;

            return (
              <motion.div
                key={step.number}
                variants={stepVariants}
                className="relative pl-6 sm:pl-8 group"
              >
                {/* Node on Vertical Spine */}
                <div
                  className={`absolute -left-[19px] sm:-left-[23px] top-6 h-4 w-4 rounded-full border-2 transition-all duration-200 ease-cinematic flex items-center justify-center ${
                    isReached
                      ? 'bg-accent border-bg shadow-[0_0_10px_#C6FF3D] ring-4 ring-accent/20'
                      : 'bg-surface-2 border-white/25'
                  }`}
                >
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-bg" />
                  )}
                </div>

                {/* Card Container */}
                <div className="card-surface rounded-card border border-white/[0.08] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
                          isReached ? 'text-accent' : 'text-white/20'
                        }`}
                      >
                        {step.number}
                      </span>
                      {isCurrent ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent shadow-[0_0_6px_#C6FF3D]" />
                          </span>
                          <span className="font-mono text-[9px] text-accent font-semibold tracking-wider uppercase">
                            Active
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted uppercase tracking-wider">
                          {step.tag}
                        </span>
                      )}
                    </div>

                    <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-accent">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading text-base sm:text-lg font-bold text-text tracking-tight">
                      {step.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
