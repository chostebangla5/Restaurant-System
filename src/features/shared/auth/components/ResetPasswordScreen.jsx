import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { TRANSITION_EASE, DURATION_SECTION, DURATION_REDUCED } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updatePassword, fetchStaffProfiles } from '../api/authApi';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | TableSuite';

    // Verify recovery session or wait for Supabase to exchange hash token
    let timeoutId;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
        setSessionChecked(true);
        return;
      }

      // Check if hash has access_token or recovery type
      const hasRecoveryHash =
        window.location.hash.includes('access_token') ||
        window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery') ||
        window.location.search.includes('code=');

      if (!hasRecoveryHash) {
        setSessionChecked(true);
        setHasValidSession(false);
      } else {
        // Give Supabase client up to 3 seconds to parse the hash/code
        timeoutId = setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          setHasValidSession(Boolean(retrySession));
          setSessionChecked(true);
        }, 2000);
      }
    };

    checkSession();

    // Listen for PASSWORD_RECOVERY or SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasValidSession(true);
        setSessionChecked(true);
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Authentication is not configured.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await updatePassword(password);
      setIsSuccess(true);
      toast.success('Password updated successfully!');

      // Redirect after a brief moment
      setTimeout(async () => {
        try {
          const user = data?.user;
          if (user?.id) {
            const profiles = await fetchStaffProfiles(user.id);
            const active = profiles?.find((p) => p.is_active !== false) || profiles?.[0];
            if (active && (active.role === 'owner' || active.role === 'manager')) {
              navigate('/admin', { replace: true });
              return;
            }
          }
        } catch {
          // fallback to staff
        }
        navigate('/staff', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Password reset failed:', err);
      toast.error(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text">
            Set New Password
          </h1>
          <p className="text-xs text-muted">
            Create a secure new password for your TableSuite account
          </p>
        </div>

        {isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Password Updated!</h3>
              <p className="text-xs text-stone-300 mt-1">
                Your password has been changed successfully. Redirecting you to your portal...
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to Sign In
            </Button>
          </div>
        ) : !sessionChecked ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted">Verifying password reset security token...</p>
          </div>
        ) : !hasValidSession ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Invalid or Expired Link</h3>
              <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                This password reset link is invalid or has expired. Password reset links can only be used once.
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Request a New Link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer text-muted hover:text-text transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <div className="relative">
              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your new password"
                leftIcon={<Lock className="h-4 w-4" />}
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-rose-400">Passwords do not match.</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold mt-2"
              isLoading={isLoading}
              disabled={!password || !confirmPassword || password !== confirmPassword || password.length < 6}
            >
              Update Password
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs text-muted hover:text-text font-medium cursor-pointer inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-2 border-t border-white/[0.08]">
          <p className="text-[11px] text-muted font-mono uppercase tracking-wider flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
            <span>Protected by Supabase Auth Encryption</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPasswordScreen;
