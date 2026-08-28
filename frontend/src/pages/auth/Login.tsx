import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import { isSupabaseConfigured } from '../../services/auth/supabaseAuth';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const ROLE_HOME: Record<string, string> = {
  asha: '/asha/dashboard',
  doctor: '/doctor/dashboard',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
};

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await signIn(email, password);
      navigate(ROLE_HOME[user.role] ?? '/patient/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gov-700 text-white flex items-center justify-center shadow-md">
            <Shield className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold text-ink tracking-tight">
          Sign In to MahaAarogya Sangam
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Government of Maharashtra Digital Public Health Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-line space-y-6">
          {!configured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Sign-in is not configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>, then restart the dev server.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-3.5 h-3.5" />}
            />

            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-gov-700 font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold"
              isLoading={isLoading}
              disabled={!configured}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="pt-2 flex items-center justify-center text-xs text-ink-soft border-t border-line">
            <Link to="/register" className="text-gov-700 font-semibold hover:underline">
              New here? Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
