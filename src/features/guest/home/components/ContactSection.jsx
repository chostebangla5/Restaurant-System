import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  PhoneCall,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { TRANSITION_EASE, DURATION_MODAL } from '@/lib/motion';

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    restaurantName: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid work email';
    }
    if (!formData.restaurantName.trim()) {
      errs.restaurantName = 'Venue name is required';
    }
    if (!formData.message.trim()) {
      errs.message = 'Please provide details about your venue or requirements';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please review the highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulated network request preserving all submission contracts
      await new Promise((resolve) => setTimeout(resolve, 1100));
      setIsSubmitted(true);
      toast.success('Inquiry received. A solutions engineer will reach out within 2 hours.');
    } catch {
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      restaurantName: '',
      message: '',
    });
    setErrors({});
    setIsSubmitted(false);
  };

  const contactDetails = [
    {
      icon: Mail,
      label: 'SALES & DEPLOYMENTS',
      value: 'deployments@tablesuite.io',
      href: 'mailto:deployments@tablesuite.io',
      description: 'Response within 2 hours during market hours',
    },
    {
      icon: PhoneCall,
      label: 'OPERATIONS DESK',
      value: '+1 (800) 492-8225',
      href: 'tel:+18004928225',
      description: '24/7 dedicated tier-1 emergency dispatch',
    },
    {
      icon: MapPin,
      label: 'GLOBAL HEADQUARTERS',
      value: '548 Market Street, Suite 9400',
      detail: 'San Francisco, CA 94104',
      description: 'Engineering & Systems Architecture Center',
    },
    {
      icon: Clock,
      label: 'DEPLOYMENT TIMELINE',
      value: 'Instant 15-Minute Provisioning',
      description: 'Zero hardware lead times or counter disruption',
    },
  ];

  return (
    <section id="contact" className="w-full relative z-10 py-16 md:py-24 space-y-16">
      {/* Section Header */}
      <div className="space-y-3 text-left md:text-center max-w-2xl md:mx-auto">
        <div className="font-mono text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/80">
          <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>DIRECT HOSPITALITY INQUIRIES</span>
        </div>
        <h2 className="h2-cinematic text-text">
          Speak With Our Deployment Engineers
        </h2>
        <p className="text-sm text-muted font-sans max-w-lg md:mx-auto leading-relaxed">
          Whether you operate a 20-seat boutique café or a 500-cover multi-floor venue, we tailor TableSuite to your floor plan.
        </p>
      </div>

      {/* Main Grid: Form Left, Contact Info Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
        {/* Form Column (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="card-surface rounded-card border border-white/[0.1] bg-surface p-8 sm:p-10 md:p-12 space-y-8 shadow-sm">
            <div className="space-y-1.5 border-b border-white/[0.06] pb-6">
              <h4 className="font-heading font-bold text-xl sm:text-2xl text-text tracking-tight">
                Request a Custom Floor Architecture
              </h4>
              <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                Fill in your venue requirements and our solutions team will prepare a tailored demonstration.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {isSubmitted ? (
                <motion.div
                  key="success-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: DURATION_MODAL, ease: TRANSITION_EASE }}
                  className="rounded-card border border-accent/40 bg-accent/[0.06] p-8 sm:p-10 text-center space-y-5"
                >
                  <div className="h-14 w-14 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(198,255,61,0.2)]">
                    <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-heading font-bold text-xl text-text tracking-tight">
                      Deployment Request Dispatched
                    </h5>
                    <p className="text-xs sm:text-sm text-muted max-w-md mx-auto font-sans leading-relaxed">
                      Thank you for contacting TableSuite. Our architecture engineering team has received your details and will prepare a tailored floor review for <span className="text-text font-semibold">{formData.restaurantName}</span>.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleReset}
                      className="rounded-full border border-white/20 hover:border-white/40 text-xs font-mono uppercase tracking-wider"
                    >
                      Send Another Inquiry
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {/* Row 1: Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="name"
                        className="block font-mono text-xs text-text/80 uppercase tracking-wider font-medium"
                      >
                        Full Name <span className="text-accent">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g. Vikram Singhania"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full h-[52px] px-4 rounded-xl bg-surface-2 border text-base sm:text-sm text-text placeholder:text-muted/50 transition-colors ${
                          errors.name
                            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-white/[0.1] hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'
                        }`}
                      />
                      {errors.name && (
                        <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5 pt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{errors.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="block font-mono text-xs text-text/80 uppercase tracking-wider font-medium"
                      >
                        Work Email <span className="text-accent">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="e.g. vikram@copperchimney.com"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full h-[52px] px-4 rounded-xl bg-surface-2 border text-base sm:text-sm text-text placeholder:text-muted/50 transition-colors ${
                          errors.email
                            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-white/[0.1] hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5 pt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{errors.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Restaurant Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="restaurantName"
                      className="block font-mono text-xs text-text/80 uppercase tracking-wider font-medium"
                    >
                      Venue or Hospitality Group Name <span className="text-accent">*</span>
                    </label>
                    <input
                      id="restaurantName"
                      name="restaurantName"
                      type="text"
                      placeholder="e.g. The Copper Chimney Flagship"
                      value={formData.restaurantName}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full h-[52px] px-4 rounded-xl bg-surface-2 border text-base sm:text-sm text-text placeholder:text-muted/50 transition-colors ${
                        errors.restaurantName
                          ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                          : 'border-white/[0.1] hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'
                      }`}
                    />
                    {errors.restaurantName && (
                      <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5 pt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{errors.restaurantName}</span>
                      </p>
                    )}
                  </div>

                  {/* Row 3: Message / Scope */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="message"
                      className="block font-mono text-xs text-text/80 uppercase tracking-wider font-medium"
                    >
                      Venue Scope &amp; Floor Requirements <span className="text-accent">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      placeholder="Tell us about your table count, kitchen stations (Hot, Cold, Bar), or POS migration needs..."
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full p-4 rounded-xl bg-surface-2 border text-base sm:text-sm text-text placeholder:text-muted/50 transition-colors resize-none ${
                        errors.message
                          ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                          : 'border-white/[0.1] hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'
                      }`}
                    />
                    {errors.message && (
                      <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5 pt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{errors.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button as Primary Pill with Loading State */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto rounded-full bg-accent text-bg font-semibold hover:bg-accent-hover px-9 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 gap-2.5 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-bg" />
                          <span>Dispatching Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Deployment Request</span>
                          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Contact Info Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-surface rounded-card border border-white/[0.1] bg-surface p-8 sm:p-10 space-y-8">
            <div className="space-y-2 border-b border-white/[0.06] pb-6">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                COMMUNICATIONS &amp; DISPATCH
              </span>
              <h4 className="font-heading font-bold text-xl text-text tracking-tight">
                Direct Engineering Channels
              </h4>
            </div>

            <div className="space-y-6">
              {contactDetails.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.03] group-hover:border-accent/40 group-hover:text-accent transition-colors flex items-center justify-center text-accent/80 shrink-0">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-wider block">
                        {item.label}
                      </span>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="font-heading font-semibold text-sm sm:text-base text-text hover:text-white transition-colors block"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="font-heading font-semibold text-sm sm:text-base text-text">
                          {item.value}
                        </p>
                      )}
                      {item.detail && (
                        <p className="text-xs text-muted/80 font-sans">
                          {item.detail}
                        </p>
                      )}
                      <p className="text-xs text-muted/60 font-sans">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
