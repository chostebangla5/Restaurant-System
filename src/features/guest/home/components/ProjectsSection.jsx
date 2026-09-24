import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease,
    },
  },
};

export function ProjectsSection() {
  const [hoveredCard, setHoveredCard] = useState(null);

  // Smooth mouse coordinates for custom cursor-following "View" pill
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const springConfig = { damping: 25, stiffness: 350 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

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
      link: '/t/TBL001',
      column: 1,
    },
    {
      id: 'roast-and-brew',
      title: 'Roast & Brew Artisan Roastery',
      subtitle: 'High-Volume Specialty Café & Roastery',
      description:
        'Peak-hour contactless QR ordering reducing morning queue times by 48% with automated barista station dispatch.',
      image: '/images/projects/roast-and-brew.jpg',
      tags: ['Specialty Café', 'Peak Velocity', 'Barista KDS'],
      ratio: 'aspect-[4/3]',
      link: '/t/CAFE01',
      column: 2,
    },
    {
      id: 'bao-house',
      title: 'Bao House Pan-Asian',
      subtitle: 'High-Volume Kitchen Display Integration',
      description:
        'Multi-station kitchen line synchronization with live prep timers across wok, dim sum, and sushi stations.',
      image: '/images/projects/bao-house.jpg',
      tags: ['Pan-Asian', 'Live Timers', 'Station Routing'],
      ratio: 'aspect-[4/3]',
      link: '/t/ASIAN01',
      column: 1,
    },
    {
      id: 'velvet-rooftop',
      title: 'Velvet Lounge & Rooftop',
      subtitle: 'Nightlife, Cocktail Bar & Instant Billing',
      description:
        'Split-billing contactless settlement via instant UPI and card terminals with real-time table turnover metrics.',
      image: '/images/projects/velvet-rooftop.jpg',
      tags: ['Nightlife & Lounge', 'UPI FastPay', 'Table Turnover'],
      ratio: 'aspect-[16/10]',
      link: '/t/ROOF01',
      column: 2,
    },
  ];

  const col1Projects = projects.filter((p) => p.column === 1);
  const col2Projects = projects.filter((p) => p.column === 2);

  return (
    <section id="projects" className="w-full relative z-10 py-16 md:py-24 space-y-16">
      {/* Custom Cursor-Following "View" Pill on Desktop */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-50 hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(198,255,61,0.5)] -translate-x-1/2 -translate-y-1/2 select-none"
        style={{
          x: cursorX,
          y: cursorY,
          opacity: hoveredCard ? 1 : 0,
          scale: hoveredCard ? 1 : 0.4,
        }}
        transition={{ opacity: { duration: 0.18 }, scale: { duration: 0.18 } }}
      >
        <span>View</span>
        <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
      </motion.div>

      {/* Section Header */}
      <div className="space-y-3 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>FEATURED DEPLOYMENTS</span>
        </div>
        <h3 className="h2-cinematic text-text">
          Selected Deployments &amp; Case Studies
        </h3>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          Explore how leading hospitality groups deploy TableSuite to eliminate queues and maximize seat velocity.
        </p>
      </div>

      {/* Staggered Two-Column Masonry-Style Layout */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10"
      >
        {/* Column 1 */}
        <div className="space-y-8 lg:space-y-10">
          {col1Projects.map((project) => (
            <motion.div
              key={project.id}
              variants={cardVariants}
              onMouseEnter={() => setHoveredCard(project.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="w-full"
            >
              <Link
                to={project.link}
                className="group relative block w-full rounded-[20px] overflow-hidden border border-white/[0.08] hover:border-white/25 bg-surface transition-all duration-500 md:cursor-none shadow-sm"
              >
                {/* Image Container with Aspect Ratio and Slow 1.05 Zoom */}
                <div className={`w-full ${project.ratio} overflow-hidden relative`}>
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080B]/95 via-[#07080B]/40 to-transparent transition-opacity duration-500" />

                  {/* Top Eyebrow Badge & Arrow */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                    <span className="font-mono text-[10px] text-white/80 uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-[#07080B]/60 backdrop-blur-md">
                      {project.subtitle}
                    </span>
                    <div className="h-8 w-8 rounded-full border border-white/15 bg-[#07080B]/60 backdrop-blur-md flex items-center justify-center text-accent group-hover:scale-110 group-hover:border-accent/40 transition-all duration-300">
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
                    <h4 className="font-heading font-bold text-xl sm:text-2xl text-text group-hover:text-white tracking-tight transition-colors">
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

        {/* Column 2 (Offset by md:pt-12 for Staggered Masonry) */}
        <div className="space-y-8 lg:space-y-10 md:pt-14">
          {col2Projects.map((project) => (
            <motion.div
              key={project.id}
              variants={cardVariants}
              onMouseEnter={() => setHoveredCard(project.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="w-full"
            >
              <Link
                to={project.link}
                className="group relative block w-full rounded-[20px] overflow-hidden border border-white/[0.08] hover:border-white/25 bg-surface transition-all duration-500 md:cursor-none shadow-sm"
              >
                {/* Image Container with Aspect Ratio and Slow 1.05 Zoom */}
                <div className={`w-full ${project.ratio} overflow-hidden relative`}>
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080B]/95 via-[#07080B]/40 to-transparent transition-opacity duration-500" />

                  {/* Top Eyebrow Badge & Arrow */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                    <span className="font-mono text-[10px] text-white/80 uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-[#07080B]/60 backdrop-blur-md">
                      {project.subtitle}
                    </span>
                    <div className="h-8 w-8 rounded-full border border-white/15 bg-[#07080B]/60 backdrop-blur-md flex items-center justify-center text-accent group-hover:scale-110 group-hover:border-accent/40 transition-all duration-300">
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
                    <h4 className="font-heading font-bold text-xl sm:text-2xl text-text group-hover:text-white tracking-tight transition-colors">
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
