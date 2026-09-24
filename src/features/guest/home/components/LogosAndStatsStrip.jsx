import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

// Count-up number component that triggers once when scrolled into view
function CountUpNumber({ target, decimals = 0, duration = 1.8 }) {
  const [value, setValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
      let startTime = null;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        // Exponential ease-out
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = target * easeProgress;

        setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setValue(target);
        }
      };

      window.requestAnimationFrame(step);
    }
  }, [isInView, hasAnimated, target, duration, decimals]);

  return <span ref={ref}>{decimals > 0 ? value.toFixed(decimals) : value}</span>;
}

export function LogosAndStatsStrip() {
  const clientLogos = [
    {
      name: 'Spice Garden',
      svg: (
        <svg viewBox="0 0 160 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <path d="M12 6C8.7 6 6 8.7 6 12C6 16.5 12 24 12 24C12 24 18 16.5 18 12C18 8.7 15.3 6 12 6ZM12 14.5C10.6 14.5 9.5 13.4 9.5 12C9.5 10.6 10.6 9.5 12 9.5C13.4 9.5 14.5 10.6 14.5 12C14.5 13.4 13.4 14.5 12 14.5Z" />
          <text x="28" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            SPICE GARDEN
          </text>
        </svg>
      ),
    },
    {
      name: 'Aura Dining',
      svg: (
        <svg viewBox="0 0 150 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <circle cx="12" cy="16" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <circle cx="12" cy="16" r="3" fill="currentColor" />
          <text x="28" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.14em">
            AURA DINING
          </text>
        </svg>
      ),
    },
    {
      name: 'Lumen Bistro',
      svg: (
        <svg viewBox="0 0 155 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <polygon points="12,6 15,13 22,16 15,19 12,26 9,19 2,16 9,13" />
          <text x="28" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            LUMEN BISTRO
          </text>
        </svg>
      ),
    },
    {
      name: 'Terra Roasters',
      svg: (
        <svg viewBox="0 0 165 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <rect x="5" y="9" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="5" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.5" />
          <text x="27" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            TERRA ROASTERS
          </text>
        </svg>
      ),
    },
    {
      name: 'Velvet Hospitality',
      svg: (
        <svg viewBox="0 0 170 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <path d="M4 8L12 24L20 8H16L12 17L8 8H4Z" />
          <text x="27" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            VELVET &amp; CO.
          </text>
        </svg>
      ),
    },
    {
      name: 'Nordic Brew',
      svg: (
        <svg viewBox="0 0 155 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <polygon points="12,7 19,11 19,20 12,24 5,20 5,11" stroke="currentColor" strokeWidth="2" fill="none" />
          <text x="27" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            NORDIC BREW
          </text>
        </svg>
      ),
    },
    {
      name: 'Kaizen Kitchen',
      svg: (
        <svg viewBox="0 0 160 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <circle cx="12" cy="16" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
          <text x="27" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            KAIZEN KITCHEN
          </text>
        </svg>
      ),
    },
    {
      name: 'Chronos Hotels',
      svg: (
        <svg viewBox="0 0 165 36" fill="currentColor" className="h-6 sm:h-7 w-auto">
          <path d="M6 7H18L12 16L18 25H6L12 16L6 7Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <text x="27" y="21" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="800" letterSpacing="0.12em">
            CHRONOS HOTELS
          </text>
        </svg>
      ),
    },
  ];

  const stats = [
    {
      value: 35,
      decimals: 0,
      prefix: '',
      suffix: '%',
      label: 'TABLE TURNOVER BOOST',
      description: 'Faster order-to-settlement cycle',
    },
    {
      value: 0.18,
      decimals: 2,
      prefix: '<',
      suffix: 's',
      label: 'DISPATCH LATENCY',
      description: 'Sub-second kitchen station sync',
    },
    {
      value: 100,
      decimals: 0,
      prefix: '',
      suffix: '%',
      label: 'DATA ISOLATION',
      description: 'Multi-tenant PostgreSQL RLS',
    },
    {
      value: 50,
      decimals: 0,
      prefix: '',
      suffix: 'K+',
      label: 'MONTHLY GUEST ORDERS',
      description: 'Processed with 99.98% accuracy',
    },
  ];

  return (
    <section className="w-full relative z-10 py-12 md:py-16 space-y-12">
      {/* Logos Marquee Section */}
      <div className="space-y-6">
        <p className="font-mono text-[11px] text-muted/60 uppercase tracking-[0.2em] text-center">
          TRUSTED BY HIGH-VOLUME RESTAURANTS &amp; HOSPITALITY GROUPS
        </p>

        {/* Marquee with Edge Fade Masks and Pause on Hover */}
        <div className="relative w-full overflow-hidden mask-fade-edges py-2">
          <div className="animate-marquee items-center gap-12 sm:gap-16 text-text">
            {/* First sequence of logos */}
            {clientLogos.map((client, idx) => (
              <div
                key={`logo-1-${idx}`}
                className="shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
                title={client.name}
              >
                {client.svg}
              </div>
            ))}
            {/* Duplicated sequence for seamless infinite loop */}
            {clientLogos.map((client, idx) => (
              <div
                key={`logo-2-${idx}`}
                className="shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
                title={client.name}
              >
                {client.svg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hairline Divider */}
      <div className="hairline-divider" />

      {/* Stats Strip with Hairline Dividers & Counting Up Numbers */}
      <div className="card-surface rounded-card border border-white/[0.08] p-8 sm:p-10 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x divide-white/[0.08]">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-between ${
                idx > 0 ? 'lg:pl-8' : ''
              } ${idx < stats.length - 1 ? 'lg:pr-8' : ''}`}
            >
              <div className="space-y-1">
                {/* Large Number in Manrope */}
                <div className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-text tracking-tight flex items-baseline">
                  {stat.prefix && (
                    <span className="text-accent text-3xl sm:text-4xl mr-1 font-mono">
                      {stat.prefix}
                    </span>
                  )}
                  <CountUpNumber
                    target={stat.value}
                    decimals={stat.decimals}
                    duration={1.8}
                  />
                  {stat.suffix && (
                    <span className="text-accent text-3xl sm:text-4xl ml-0.5 font-sans font-bold">
                      {stat.suffix}
                    </span>
                  )}
                </div>

                {/* Monospace Label Beneath */}
                <p className="font-mono text-xs text-muted uppercase tracking-wider pt-2">
                  {stat.label}
                </p>
              </div>

              {/* Subtitle / Description */}
              <p className="text-[11px] text-muted/70 font-sans mt-3">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
