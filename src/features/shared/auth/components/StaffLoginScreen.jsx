import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { signUpOwner, signUpStaff, generateSlug } from '../api/authApi';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function StaffLoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-8">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-primary to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-primary/20">
            TS
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-3">
            TableSuite
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            {mode === 'login'
              ? 'Sign in to manage your restaurant'
              : 'Create your restaurant or staff account'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex mx-8 p-1 rounded-xl bg-stone-800/60 border border-stone-700/50 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-stone-700 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-stone-700 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="px-8 pb-8">
          {mode === 'login' ? (
            <LoginForm navigate={navigate} />
          ) : (
            <SignUpForm navigate={navigate} setMode={setMode} />
          )}
        </div>

        <div className="text-center pb-6">
          <p className="text-[11px] text-stone-500">
            Protected by Supabase Row-Level Security & Role Isolation
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithPassword } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Supabase connection is not configured. Please check environment variables.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success('Signed in successfully!');
      navigate('/staff');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
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
      <Button type="submit" size="lg" className="w-full font-bold" isLoading={isLoading}>
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
      toast('Supabase not configured — enter your project URL & anon key in .env.local', {
        icon: '⚠️',
        duration: 5000,
      });
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
      <div className="flex gap-2 p-1 bg-stone-800/40 rounded-xl border border-stone-800">
        <button
          type="button"
          onClick={() => setSignupType('staff')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
            signupType === 'staff'
              ? 'bg-brand-primary text-white'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Join Restaurant Staff
        </button>
        <button
          type="button"
          onClick={() => setSignupType('owner')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
            signupType === 'owner'
              ? 'bg-brand-primary text-white'
              : 'text-stone-400 hover:text-stone-200'
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
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Select Restaurant Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs text-white focus:border-brand-primary focus:outline-none"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Role Applying For
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs text-white focus:border-brand-primary focus:outline-none"
            >
              <option value="waiter">Waiter (Floor Staff)</option>
              <option value="kitchen">Kitchen (KDS & Chef)</option>
              <option value="manager">Manager</option>
            </select>
            <p className="text-[10px] text-amber-500/90 mt-1">
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
      <Button type="submit" size="lg" className="w-full font-bold" isLoading={isLoading}>
        {signupType === 'staff' ? 'Submit Registration for Approval' : 'Create Restaurant Account'}
      </Button>

      <p className="text-center text-xs text-stone-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-brand-primary font-semibold hover:underline"
        >
          Sign In
        </button>
      </p>
    </form>
  );
}
