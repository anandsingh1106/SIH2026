import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../services/auth/authContext';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gov-700 text-white flex items-center justify-center shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-ink text-lg">MahaAarogya Sangam</span>
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold text-ink">Reset Your Password</h2>
        <p className="text-xs text-ink-soft mt-1">
          We'll email you a secure link to set a new password
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface py-8 px-6 shadow-card rounded-2xl border border-line space-y-6">
          {sent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reset Link Sent
              </div>
              <p>
                If <strong>{email}</strong> is registered, a password reset link is on its way.
                Check your inbox and spam folder.
              </p>
              <Link to="/login" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">Return to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-3.5 h-3.5" />}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full font-bold" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="text-center text-xs text-ink-soft pt-2 border-t border-line">
            Remembered your password?{' '}
            <Link to="/login" className="text-gov-700 font-bold hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
