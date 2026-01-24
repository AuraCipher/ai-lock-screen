import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface PasswordResetProps {
  onBack: () => void;
}

export default function PasswordReset({ onBack }: PasswordResetProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength checks
  const passwordChecks = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'Contains number', valid: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const isPasswordStrong = passwordChecks.filter(check => check.valid).length >= 4;
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordStrong) {
      toast.error('Please use a stronger password');
      return;
    }

    if (!doPasswordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Go back after delay
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-12 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-foreground mb-2">Password Updated!</h3>
        <p className="text-muted-foreground">Your password has been changed successfully.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter your current password and choose a new secure password for your account.
      </p>

      {/* Current Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <label className="text-sm font-medium text-foreground mb-2 block">
          Current Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter current password"
            required
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            {showCurrentPassword ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </motion.div>

      {/* New Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="text-sm font-medium text-foreground mb-2 block">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter new password"
            required
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            {showNewPassword ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Password strength indicators */}
        {newPassword.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2"
          >
            {passwordChecks.map((check, index) => (
              <motion.div
                key={check.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2"
              >
                {check.valid ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${check.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {check.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Confirm Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="text-sm font-medium text-foreground mb-2 block">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 ${
              confirmPassword.length > 0
                ? doPasswordsMatch
                  ? 'border-emerald-500 focus:ring-emerald-500'
                  : 'border-destructive focus:ring-destructive'
                : 'border-input focus:ring-primary'
            }`}
            placeholder="Confirm new password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
        {confirmPassword.length > 0 && !doPasswordsMatch && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Passwords do not match
          </p>
        )}
      </motion.div>

      {/* Submit Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="submit"
        disabled={loading || !isPasswordStrong || !doPasswordsMatch}
        className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Update Password
          </>
        )}
      </motion.button>
    </form>
  );
}
