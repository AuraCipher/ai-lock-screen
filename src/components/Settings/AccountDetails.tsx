import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Mail, Calendar, User, Clock, Shield, CheckCircle } from 'lucide-react';
// supabase import removed - using session data directly
import { Profile } from './index';
import { format } from 'date-fns';

interface AccountDetailsProps {
  session: Session;
  profile: Profile | null;
}

export default function AccountDetails({ session, profile }: AccountDetailsProps) {
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    // Get user metadata from session
    const user = session.user;
    if (user.created_at) {
      setCreatedAt(user.created_at);
    }
    if (user.last_sign_in_at) {
      setLastSignIn(user.last_sign_in_at);
    }
  }, [session]);

  const accountInfo = [
    {
      icon: Mail,
      label: 'Email Address',
      value: session.user.email || 'Not set',
      verified: session.user.email_confirmed_at ? true : false,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: User,
      label: 'Username',
      value: profile?.username || 'Not set',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Calendar,
      label: 'Account Created',
      value: createdAt ? format(new Date(createdAt), 'MMMM d, yyyy') : 'Unknown',
      color: 'from-emerald-500 to-green-500',
    },
    {
      icon: Clock,
      label: 'Last Sign In',
      value: lastSignIn ? format(new Date(lastSignIn), 'MMMM d, yyyy • h:mm a') : 'Unknown',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Shield,
      label: 'Account ID',
      value: session.user.id.slice(0, 8) + '...' + session.user.id.slice(-4),
      color: 'from-gray-500 to-gray-600',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-6">
        View your account information and details. Some information may be managed through your authentication provider.
      </p>

      {accountInfo.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border"
        >
          {/* Icon */}
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} shadow-lg flex-shrink-0`}>
            <item.icon className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="font-medium text-foreground truncate flex items-center gap-2">
              {item.value}
              {item.verified !== undefined && item.verified && (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
            </p>
          </div>
        </motion.div>
      ))}

      {/* Email verification status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`p-4 rounded-xl border ${
          session.user.email_confirmed_at 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle className={`h-5 w-5 ${
            session.user.email_confirmed_at ? 'text-emerald-500' : 'text-yellow-500'
          }`} />
          <div>
            <p className={`font-medium ${
              session.user.email_confirmed_at ? 'text-emerald-700 dark:text-emerald-400' : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {session.user.email_confirmed_at ? 'Email Verified' : 'Email Not Verified'}
            </p>
            <p className="text-sm text-muted-foreground">
              {session.user.email_confirmed_at 
                ? `Verified on ${format(new Date(session.user.email_confirmed_at), 'MMMM d, yyyy')}`
                : 'Please verify your email to access all features'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
