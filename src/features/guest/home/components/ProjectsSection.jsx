import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';

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


export function ProjectsSection() {
  const projects = [
    {
      id: 'copper-chimney',
      title: 'The Copper Chimney Flagship',
      subtitle: 'Fine Dining & Multi-Floor Service',
      description:
        'Autonomous multi-round QR ordering and sub-second kitchen routing across 42 tables and 3 floor zones.',
      image: '/images/projects/copper-chimney.jpg',
      tags: ['Fine Dining', 'Multi-Round POS', 'Sub-Second KDS'],
      ratio: 'aspect-[16/10]',
      link: '/t/DEMO1',
      column: 1,
    },
    {
      id: 'roast-brew',
      title: 'Roast & Brew Artisan Roasteries',
      subtitle: 'High-Volume Fast Casual',
      description:
        'Eliminated morning counter queues completely with instant QR order ingestion and automated barista station routing.',
      image: '/images/projects/roast-brew.jpg',
      tags: ['Specialty Coffee', 'Queue Elimination', 'Barista Dispatch'],
      ratio: 'aspect-[4/3]',
      link: '/t/DEMO2',
      column: 2,
    },
    {
      id: 'bombay-canteen',
      title: 'The Bombay Social Club',
      subtitle: 'Bar, Lounge & Modern Indian Kitchen',
      description:
        'Seamless drinks re-ordering directly from cocktail tables with automated bar ticket printing and split billing.',
      image: '/images/projects/bombay-canteen.jpg',
      tags: ['Lounge & Cocktails', 'Real-Time Sync', 'Contactless Pay'],
      ratio: 'aspect-[4/3]',
      link: '/t/DEMO3',
      column: 1,
    },
    {
      id: 'heritage-haveli',
      title: 'Haveli Heritage Courtyard',
      subtitle: 'Luxury Banquet & Heritage Dining',
      description:
        'Full digital menu with multilingual allergen tagging, chef notes, and real-time inventory decrement sync.',
      image: '/images/projects/heritage-haveli.jpg',
      tags: ['Heritage Venue', 'Custom Menu Engine', 'Table Audits'],
      ratio: 'aspect-[16/10]',
      link: '/t/DEMO1',
      column: 2,
    },
  ];

  const col1Projects = projects.filter((p) => p.column === 1);
  const col2Projects = projects.filter((p) => p.column === 2);

  return (
    <section id="projects" className="w-full relative z-10 py-16 md:py-24 space-y-16">
      {/* Section Header */}
      <div className="space-y-3 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>FEATURED DEPLOYMENTS</span>
        </div>
        <h2 className="h2-cinematic text-text">
          Selected Deployments &amp; Case Studies
        </h2>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          Explore how leading hospitality groups deploy TableSuite to eliminate queues and maximize seat velocity.
        </p>
      </div>

      {/* 2-Column Staggered Masonry Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 items-start"
      >
        {/* Column 1 */}
        <div className="space-y-8 lg:space-y-10">
          {col1Projects.map((project) => (
            <motion.div
              key={project.id}
              variants={cardVariants}
              className="w-full"
            >
              <Link
                to={project.link}
                className="group relative block w-full rounded-card overflow-hidden border border-white/[0.08] hover:border-white/25 bg-surface transition-all duration-200 ease-cinematic shadow-sm"
              >
                {/* Image Container with Aspect Ratio and Slow 1.05 Zoom */}
                <div className={`w-full ${project.ratio} overflow-hidden relative`}>
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-300 ease-cinematic"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080B]/95 via-[#07080B]/40 to-transparent transition-opacity duration-300" />

                  {/* Top Eyebrow Badge & Arrow */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                    <span className="font-mono text-[10px] text-white/80 uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-[#07080B]/60 backdrop-blur-md">
                      {project.subtitle}
                    </span>
                    <div className="h-8 w-8 rounded-full border border-white/15 bg-[#07080B]/60 backdrop-blur-md flex items-center justify-center text-accent group-hover:scale-110 group-hover:border-accent/40 transition-all duration-200">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Bottom Content: Title & Tag Pills */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10 space-y-3">
                    {/* Tag Pills */}
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md text-accent font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h4 className="font-heading font-bold text-xl sm:text-2xl text-text group-hover:text-white tracking-tight transition-colors duration-200">
                      {project.title}
                    </h4>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted font-sans line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Column 2 (Offset by md:pt-14 for Staggered Masonry) */}
        <div className="space-y-8 lg:space-y-10 md:pt-14">
          {col2Projects.map((project) => (
            <motion.div
              key={project.id}
              variants={cardVariants}
              className="w-full"
            >
              <Link
                to={project.link}
                className="group relative block w-full rounded-card overflow-hidden border border-white/[0.08] hover:border-white/25 bg-surface transition-all duration-200 ease-cinematic shadow-sm"
              >
                {/* Image Container with Aspect Ratio and Slow 1.05 Zoom */}
                <div className={`w-full ${project.ratio} overflow-hidden relative`}>
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-300 ease-cinematic"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080B]/95 via-[#07080B]/40 to-transparent transition-opacity duration-300" />

                  {/* Top Eyebrow Badge & Arrow */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                    <span className="font-mono text-[10px] text-white/80 uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-[#07080B]/60 backdrop-blur-md">
                      {project.subtitle}
                    </span>
                    <div className="h-8 w-8 rounded-full border border-white/15 bg-[#07080B]/60 backdrop-blur-md flex items-center justify-center text-accent group-hover:scale-110 group-hover:border-accent/40 transition-all duration-200">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Bottom Content: Title & Tag Pills */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10 space-y-3">
                    {/* Tag Pills */}
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md text-accent font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h4 className="font-heading font-bold text-xl sm:text-2xl text-text group-hover:text-white tracking-tight transition-colors duration-200">
                      {project.title}
                    </h4>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted font-sans line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default ProjectsSection;
