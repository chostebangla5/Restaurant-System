import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowUpRight } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease,
    },
  },
};

export function AboutSection() {
  const stats = [
    { value: '99.98%', label: 'SYSTEM AVAILABILITY' },
    { value: '<120ms', label: 'KDS DISPATCH SPEED' },
    { value: '1.2M+', label: 'ORDERS PROCESSED' },
    { value: '+35%', label: 'TABLE VELOCITY LIFT' },
  ];

  const team = [
    {
      id: 'kabir-sen',
      name: 'Kabir Sen',
      role: 'FOUNDER & CEO',
      bio: 'Ex-Stripe infrastructure engineer. Hospitality technology angel and dining systems architect.',
      image: '/images/team/kabir-sen.jpg',
    },
    {
      id: 'ananya-roy',
      name: 'Ananya Roy',
      role: 'VP OF ENGINEERING',
      bio: 'Distributed systems lead. Scaled sub-second transaction pipelines and real-time ordering engines.',
      image: '/images/team/ananya-roy.jpg',
    },
    {
      id: 'david-vance',
      name: 'Chef David Vance',
      role: 'HEAD OF HOSPITALITY OPS',
      bio: 'Former Michelin-starred operations director. Passionate about eliminating back-of-house bottlenecks.',
      image: '/images/team/david-vance.jpg',
    },
    {
      id: 'maya-lin',
      name: 'Maya Lin',
      role: 'HEAD OF PRODUCT & DESIGN',
      bio: 'Design systems lead. Obsessed with high-contrast typography, friction-free ordering, and kinetic UI.',
      image: '/images/team/maya-lin.jpg',
    },
  ];

  return (
    <section id="about" className="w-full relative z-10 py-16 md:py-24 space-y-20">
      {/* Top Split Layout: Large Heading Left, Body Text & Stats Right */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
      >
        {/* Left Column: Eyebrow and Large H2 */}
        <motion.div variants={itemVariants} className="lg:col-span-5 space-y-6">
          <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
            <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
            <span>ABOUT TABLESUITE</span>
          </div>

          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-text tracking-[-0.035em] leading-[1.05]">
            Architecting the Operating System for Modern Dining.
          </h2>
        </motion.div>

        {/* Right Column: Body Text and Stats */}
        <motion.div variants={itemVariants} className="lg:col-span-7 space-y-10">
          <div className="space-y-4 text-base sm:text-lg text-muted font-sans leading-relaxed">
            <p>
              We founded TableSuite to dismantle the friction between dining guests, service staff, and the kitchen pass. Obsolete legacy POS terminals, slow paper billing, and counter queues throttle dining velocity.
            </p>
            <p>
              By unifying table QR ingestion, sub-second kitchen dispatch screens, and contactless instant settlement into an autonomous pipeline, TableSuite empowers operators to maximize table turns while delivering effortless hospitality.
            </p>
          </div>

          {/* Stats Grid with Hairline Column Dividers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/[0.08]">
            {stats.map((s, idx) => (
              <div
                key={idx}
                className={`space-y-1.5 ${
                  idx > 0 ? 'sm:border-l sm:border-white/[0.08] sm:pl-6' : ''
                }`}
              >
                <div className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] text-muted uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Hairline Divider */}
      <div className="hairline-divider" />

      {/* Team Cards Section */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">
              LEADERSHIP &amp; ENGINEERING
            </span>
            <h3 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
              The Minds Behind TableSuite
            </h3>
          </div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider">
            Built by engineers and hospitality operators
          </p>
        </div>

        {/* 4-Column Team Grid with Grayscale-to-Color Photos, Manrope Name, Mono Role, Hairline Border & Slight Hover Lift */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {team.map((member) => (
            <motion.div
              key={member.id}
              variants={itemVariants}
              className="card-surface rounded-[20px] overflow-hidden border border-white/[0.08] hover:border-white/25 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between shadow-sm"
            >
              {/* Photo Container: Grayscale that gains color on hover */}
              <div className="w-full aspect-[4/5] relative overflow-hidden bg-surface-2">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 group-hover:contrast-100 transition-all duration-500 transform group-hover:scale-105"
                  loading="lazy"
                />

                {/* Subtle bottom fade mask into card content */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-75 group-hover:opacity-30 transition-opacity duration-300" />
              </div>

              {/* Info Block: Name in Manrope, Role in Mono, Hairline Border */}
              <div className="p-5 sm:p-6 space-y-2 bg-surface relative z-10 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-lg text-text tracking-tight group-hover:text-white transition-colors">
                    {member.name}
                  </h4>
                  <span className="font-mono text-xs text-accent uppercase tracking-wider block">
                    {member.role}
                  </span>
                </div>

                <p className="text-xs text-muted font-sans leading-relaxed pt-2 border-t border-white/[0.06]">
                  {member.bio}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
