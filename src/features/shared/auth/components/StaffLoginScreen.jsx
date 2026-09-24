import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { TRANSITION_EASE, DURATION_SECTION, DURATION_REDUCED } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { signUpOwner, signUpStaff, generateSlug, resendConfirmationEmail } from '../api/authApi';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function StaffLoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 selection:bg-accent selection:text-bg relative overflow-hidden font-sans">
      <div className="absolute inset-0 hero-radial-glow faint-grid pointer-events-none opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_SECTION,
          ease: TRANSITION_EASE,
        }}
        className="relative z-10 w-full max-w-md rounded-card bg-surface border border-white/10 shadow-2xl p-8 sm:p-10 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-11 w-11 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-accent font-heading font-extrabold text-base shadow-sm">
            TS
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text">
            TableSuite
          </h1>
          <p className="text-xs text-muted">
            {mode === 'login'
              ? 'Sign in to manage your restaurant'
              : 'Create your restaurant or staff account'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1 rounded-full bg-surface-2 border border-white/10">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 min-h-[40px] text-xs font-medium rounded-full touch-manipulation transition-all duration-200 cursor-pointer flex items-center justify-center ${
              mode === 'login'
                ? 'bg-surface text-text shadow-sm border border-white/15'
                : 'text-muted hover:text-text'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 min-h-[40px] text-xs font-medium rounded-full touch-manipulation transition-all duration-200 cursor-pointer flex items-center justify-center ${
              mode === 'signup'
                ? 'bg-surface text-text shadow-sm border border-white/15'
                : 'text-muted hover:text-text'
            }`}
          >
            Create Account
          </button>
        </div>

        <div>
          {mode === 'login' ? (
            <LoginForm navigate={navigate} />
          ) : (
            <SignUpForm navigate={navigate} setMode={setMode} />
          )}
        </div>

        <div className="text-center pt-2 border-t border-white/[0.08]">
          <p className="text-[11px] text-muted font-mono uppercase tracking-wider flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
            <span>Protected by Supabase Row-Level Security &amp; Role Isolation</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function LoginForm({ navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const { signInWithPassword } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Supabase connection is not configured. Please check environment variables.');
      return;
    }

    setIsLoading(true);
    setUnconfirmedEmail(null);
    try {
      await signInWithPassword(email, password);
      toast.success('Signed in successfully!');
      navigate('/staff');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(email);
        toast.error('Email not confirmed yet. Check your inbox or resend the verification link.');
      } else {
        toast.error(msg || 'Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedEmail) return;
    try {
      setIsResending(true);
      await resendConfirmationEmail(unconfirmedEmail);
      toast.success(`Verification email resent to ${unconfirmedEmail}! Please check your inbox and spam folder.`);
    } catch (err) {
      toast.error(err.message || 'Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="staff@restaurant.com"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="••••••••"
      />

      {unconfirmedEmail && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-bold text-white text-sm">Email Not Confirmed Yet</p>
              <p className="text-[11px] text-stone-300 mt-1">
                Supabase sent a verification link to <strong className="text-white">{unconfirmedEmail}</strong>. Please check your inbox or spam folder.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              disabled={isResending}
              onClick={handleResend}
              className="px-3.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs transition-colors border border-amber-500/30"
            >
              {isResending ? 'Resending Link...' : 'Resend Verification Email'}
            </button>
          </div>
          <p className="text-[10px] text-stone-400 pt-1 border-t border-amber-500/20">
            Tip: In Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email, disable &quot;Confirm email&quot; for instant login without verification.
          </p>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full font-semibold mt-2" isLoading={isLoading}>
        Sign In to Portal
      </Button>
    </form>
  );
}

function SignUpForm({ navigate, setMode }) {
  const [signupType, setSignupType] = useState('staff'); // 'staff' | 'owner'
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedRole, setSelectedRole] = useState('waiter');
  const [formData, setFormData] = useState({
    fullName: '',
    orgName: '',
    venueName: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadVenues() {
      try {
        const { data } = await supabase.from('venues').select('id, name').eq('is_active', true);
        if (data && data.length > 0) {
          setVenues(data);
          setSelectedVenueId(data[0].id);
        }
      } catch (err) {
        console.warn('Could not load venues for signup:', err);
      }
    }
    loadVenues();
  }, []);

  const slug = generateSlug(formData.venueName);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Supabase not configured — enter your project URL & anon key in .env.local');
      return;
    }

    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      if (signupType === 'staff') {
        if (!selectedVenueId) {
          toast.error('Please select a restaurant venue');
          setIsLoading(false);
          return;
        }

        await signUpStaff({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          venueId: selectedVenueId,
          role: selectedRole,
        });

        toast.success(
          'Registration submitted! Your account is pending confirmation by the restaurant admin. Sign in to view status.',
          { duration: 8000 }
        );
        setMode('login');
      } else {
        if (!formData.orgName || !formData.venueName) {
          toast.error('Please enter Organization and Venue name');
          setIsLoading(false);
          return;
        }

        const result = await signUpOwner({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          orgName: formData.orgName,
          venueName: formData.venueName,
          venueSlug: slug,
        });

        if (result?.requiresEmailVerification) {
          toast.success(
            'Account created! If email confirmation is enabled, check your inbox or disable "Confirm email" in Supabase to login immediately.',
            { duration: 8000 }
          );
          setMode('login');
          return;
        }

        toast.success('Restaurant owner account created! Welcome to TableSuite.');
        navigate('/staff/settings');
      }
    } catch (err) {
      const msg = err?.message || 'Registration failed';
      if (msg.includes('security purposes') || msg.includes('over_email_send_rate_limit')) {
        toast.error(
          'Supabase email cooldown active. Please wait 45-60s before retrying, or disable "Confirm email" in Supabase Auth settings to skip emails.',
          { duration: 8000 }
        );
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
        toast.error('This email is already registered. Please sign in on the Staff Sign In tab.', { duration: 6000 });
        setMode('login');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      {/* Sub-type switcher */}
      <div className="flex p-1 bg-surface-2 rounded-full border border-white/10">
        <button
          type="button"
          onClick={() => setSignupType('staff')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
            signupType === 'staff'
              ? 'bg-accent text-bg font-semibold shadow-xs'
              : 'text-muted hover:text-text'
          }`}
        >
          Join Restaurant Staff
        </button>
        <button
          type="button"
          onClick={() => setSignupType('owner')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
            signupType === 'owner'
              ? 'bg-accent text-bg font-semibold shadow-xs'
              : 'text-muted hover:text-text'
          }`}
        >
          New Restaurant Owner
        </button>
      </div>

      <Input
        label="Your Full Name"
        value={formData.fullName}
        onChange={handleChange('fullName')}
        required
        placeholder="e.g. Rahul Sharma"
      />

      {signupType === 'staff' ? (
        <>
          {venues.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text/80 mb-1.5">
                Select Restaurant Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-xs text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id} className="bg-surface text-text">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text/80 mb-1.5">
              Role Applying For
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-xs text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="waiter" className="bg-surface text-text">Waiter (Floor Staff)</option>
              <option value="kitchen" className="bg-surface text-text">Kitchen (KDS & Chef)</option>
              <option value="manager" className="bg-surface text-text">Manager</option>
            </select>
            <p className="text-[11px] text-amber-400/90 mt-1 font-mono">
              * Account will be pending approval by the restaurant admin before activation.
            </p>
          </div>
        </>
      ) : (
        <>
          <Input
            label="Organization / Brand Name"
            value={formData.orgName}
            onChange={handleChange('orgName')}
            required
            placeholder="Spice Garden Hospitality"
            helperText="The parent company that owns your venues"
          />
          <Input
            label="First Venue Name"
            value={formData.venueName}
            onChange={handleChange('venueName')}
            required
            placeholder="Spice Garden Downtown"
            helperText={slug ? `Guest URL: /t/... • Venue slug: ${slug}` : ''}
          />
        </>
      )}

      <Input
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        required
        placeholder="staff@restaurant.com"
      />
      <Input
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleChange('password')}
        required
        placeholder="Minimum 6 characters"
      />
      <Button type="submit" size="lg" className="w-full font-semibold mt-2" isLoading={isLoading}>
        {signupType === 'staff' ? 'Submit Registration for Approval' : 'Create Restaurant Account'}
      </Button>

      <p className="text-center text-xs text-muted pt-2">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-accent font-semibold hover:underline cursor-pointer"
        >
          Sign In
        </button>
      </p>
    </form>
  );
}
