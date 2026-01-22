import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Eye, 
  EyeOff,
  Sparkles,
  AtSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap
} from 'lucide-react';

type AuthMode = 'signin' | 'signup';
type SignUpStep = 'email' | 'name' | 'username' | 'dob' | 'password' | 'confirmation';

interface SignUpData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<SignUpStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign up state
  const [signUpData, setSignUpData] = useState<SignUpData>({
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });
  
  // Username availability
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  
  // Email check
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const steps: SignUpStep[] = ['email', 'name', 'username', 'dob', 'password', 'confirmation'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleModeToggle = () => {
    setIsRightPanelActive(!isRightPanelActive);
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setCurrentStep('email');
    setSignUpData({
      email: '',
      firstName: '',
      lastName: '',
      username: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: ''
    });
    setEmailExists(null);
    setUsernameAvailable(null);
  };

  // Check email existence
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      
      setEmailExists(!!data);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Check username availability
  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    try {
      const { data } = await supabase
        .from('profiles_public')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      const isAvailable = !data;
      setUsernameAvailable(isAvailable);
      
      if (!isAvailable) {
        const suggestions = [
          `${username}${Math.floor(Math.random() * 100)}`,
          `${username}_${Math.floor(Math.random() * 100)}`,
          `the_${username}`,
          `${username}.official`,
          `real_${username}`
        ];
        setUsernameSuggestions(suggestions.slice(0, 3));
      } else {
        setUsernameSuggestions([]);
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (signUpData.username) {
        checkUsername(signUpData.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [signUpData.username]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      
      if (error) throw error;
      toast.success('Welcome back!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    switch (currentStep) {
      case 'email':
        if (!signUpData.email || !signUpData.email.includes('@')) {
          toast.error('Please enter a valid email');
          return;
        }
        await checkEmailExists(signUpData.email);
        if (emailExists) {
          toast.error('This email is already registered. Please sign in instead.');
          return;
        }
        setCurrentStep('name');
        break;
      case 'name':
        if (!signUpData.firstName.trim()) {
          toast.error('Please enter your first name');
          return;
        }
        setCurrentStep('username');
        break;
      case 'username':
        if (!signUpData.username || signUpData.username.length < 3) {
          toast.error('Username must be at least 3 characters');
          return;
        }
        if (!usernameAvailable) {
          toast.error('Please choose an available username');
          return;
        }
        setCurrentStep('dob');
        break;
      case 'dob':
        if (!signUpData.dateOfBirth) {
          toast.error('Please enter your date of birth');
          return;
        }
        // Age validation (16+)
        const birth = new Date(signUpData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age < 16) {
          toast.error('You must be at least 16 years old');
          return;
        }
        setCurrentStep('password');
        break;
      case 'password':
        if (signUpData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        if (signUpData.password !== signUpData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        setCurrentStep('confirmation');
        break;
      case 'confirmation':
        await handleSignUp();
        break;
    }
  };

  const handlePrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            username: signUpData.username,
            date_of_birth: signUpData.dateOfBirth,
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: signUpData.email,
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            username: signUpData.username,
            date_of_birth: signUpData.dateOfBirth,
          });
        
        if (profileError) console.error('Profile creation error:', profileError);
      }
      
      toast.success('Account created! Please check your email to verify.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!signInEmail) {
      toast.error('Please enter your email first');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(signInEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const renderSignUpStep = () => {
    const stepVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    };

    switch (currentStep) {
      case 'email':
        return (
          <motion.div key="email" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Let's get started</h2>
              <p className="text-muted-foreground mt-2">Enter your email to create an account</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                onBlur={() => checkEmailExists(signUpData.email)}
                placeholder="your@email.com"
                className="w-full pl-12 pr-12 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {checkingEmail && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />}
              {emailExists === false && !checkingEmail && signUpData.email && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
              {emailExists === true && !checkingEmail && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />}
            </div>
            {emailExists && <p className="text-sm text-destructive">This email is already registered</p>}
          </motion.div>
        );
      
      case 'name':
        return (
          <motion.div key="name" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">What's your name?</h2>
              <p className="text-muted-foreground mt-2">Let us know how to address you</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={signUpData.firstName}
                  onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                  placeholder="First name"
                  className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={signUpData.lastName}
                  onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                  placeholder="Last name (optional)"
                  className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </motion.div>
        );
      
      case 'username':
        return (
          <motion.div key="username" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AtSign className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Choose your username</h2>
              <p className="text-muted-foreground mt-2">This is how others will find you</p>
            </div>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={signUpData.username}
                onChange={(e) => setSignUpData({ ...signUpData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="username"
                className="w-full pl-12 pr-12 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {checkingUsername && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />}
              {usernameAvailable === true && !checkingUsername && signUpData.username.length >= 3 && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
              {usernameAvailable === false && !checkingUsername && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />}
            </div>
            {usernameAvailable === true && signUpData.username.length >= 3 && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> @{signUpData.username} is available!
              </p>
            )}
            {usernameAvailable === false && usernameSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Username taken. Try these:</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setSignUpData({ ...signUpData, username: suggestion })}
                      className="px-3 py-1.5 bg-muted text-foreground rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      @{suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );
      
      case 'dob':
        return (
          <motion.div key="dob" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">When's your birthday?</h2>
              <p className="text-muted-foreground mt-2">We'll never share this with anyone</p>
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="date"
                value={signUpData.dateOfBirth}
                onChange={(e) => setSignUpData({ ...signUpData, dateOfBirth: e.target.value })}
                max={maxDateString}
                className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">You must be at least 16 years old</p>
          </motion.div>
        );
      
      case 'password':
        return (
          <motion.div key="password" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Create a password</h2>
              <p className="text-muted-foreground mt-2">Make it strong and memorable</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  placeholder="Password (min 6 characters)"
                  className="w-full pl-12 pr-12 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full pl-12 pr-12 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {signUpData.password && signUpData.confirmPassword && (
                <p className={`text-sm flex items-center gap-1 ${signUpData.password === signUpData.confirmPassword ? 'text-green-500' : 'text-destructive'}`}>
                  {signUpData.password === signUpData.confirmPassword ? <><CheckCircle2 className="h-4 w-4" /> Passwords match</> : <><XCircle className="h-4 w-4" /> Passwords do not match</>}
                </p>
              )}
            </div>
          </motion.div>
        );
      
      case 'confirmation':
        return (
          <motion.div key="confirmation" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Almost there!</h2>
              <p className="text-muted-foreground mt-2">Review your details and create your account</p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">Email</span>
                <span className="text-foreground font-medium text-sm">{signUpData.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">Name</span>
                <span className="text-foreground font-medium text-sm">{signUpData.firstName} {signUpData.lastName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">Username</span>
                <span className="text-foreground font-medium text-sm">@{signUpData.username}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-sm">Birthday</span>
                <span className="text-foreground font-medium text-sm">{new Date(signUpData.dateOfBirth).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-5xl h-[680px] bg-card rounded-3xl shadow-2xl overflow-hidden relative border border-border">
        <div className="flex h-full relative">
          
          {/* Sign In Form Panel */}
          <motion.div
            className="w-1/2 p-8 lg:p-12 flex flex-col justify-center absolute inset-y-0 left-0 bg-card"
            style={{ zIndex: isRightPanelActive ? 5 : 15 }}
            animate={{
              opacity: isRightPanelActive ? 0 : 1,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-sm mx-auto w-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
                <p className="text-muted-foreground mt-2">Sign in to continue your journey</p>
              </div>
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-12 pr-12 py-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="text-right">
                  <button type="button" onClick={handleForgotPassword} className="text-sm text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="h-5 w-5" /></>}
                </button>
              </form>
              
              {/* Mobile toggle */}
              <div className="lg:hidden mt-6 text-center">
                <p className="text-muted-foreground text-sm">Don't have an account?</p>
                <button onClick={handleModeToggle} className="text-primary font-semibold hover:underline mt-1">
                  Create Account
                </button>
              </div>
              
              <p className="text-center mt-8 text-xs text-muted-foreground">
                Powered by <span className="font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AureX</span>
              </p>
            </div>
          </motion.div>
          
          {/* Sign Up Form Panel */}
          <motion.div
            className="w-1/2 p-8 lg:p-12 flex flex-col justify-center absolute inset-y-0 right-0 bg-card"
            style={{ zIndex: isRightPanelActive ? 15 : 5 }}
            animate={{
              opacity: isRightPanelActive ? 1 : 0,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-sm mx-auto w-full">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {steps.map((step, index) => (
                  <motion.div
                    key={step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                    animate={{ width: index <= currentStepIndex ? 24 : 8 }}
                  />
                ))}
              </div>
              
              <AnimatePresence mode="wait">
                {renderSignUpStep()}
              </AnimatePresence>
              
              <div className="flex gap-3 mt-6">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className="flex-1 py-4 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>
                )}
                <button
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className={`${currentStepIndex > 0 ? 'flex-1' : 'w-full'} py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : currentStep === 'confirmation' ? (
                    <><span>Create Account</span><Check className="h-5 w-5" /></>
                  ) : (
                    <><span>Continue</span><ArrowRight className="h-5 w-5" /></>
                  )}
                </button>
              </div>
              
              {/* Mobile toggle */}
              <div className="lg:hidden mt-6 text-center">
                <p className="text-muted-foreground text-sm">Already have an account?</p>
                <button onClick={handleModeToggle} className="text-primary font-semibold hover:underline mt-1">
                  Sign In
                </button>
              </div>
              
              <p className="text-center mt-6 text-xs text-muted-foreground">
                Powered by <span className="font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AureX</span>
              </p>
            </div>
          </motion.div>
          
          {/* Overlay Panel - Hidden on mobile */}
          <motion.div
            className="hidden lg:flex w-1/2 absolute inset-y-0 bg-gradient-to-br from-primary via-purple-600 to-pink-500 z-20 items-center justify-center"
            initial={{ left: '50%' }}
            animate={{
              left: isRightPanelActive ? '0%' : '50%',
              borderRadius: isRightPanelActive ? '0 24px 24px 0' : '24px 0 0 24px'
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            
            <div className="text-center text-white p-12 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {mode === 'signup' ? (
                    <>
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Zap className="h-10 w-10 text-white" />
                      </div>
                      <h2 className="text-4xl font-bold mb-4">Welcome Back!</h2>
                      <p className="text-white/80 mb-8 max-w-xs mx-auto leading-relaxed">
                        Already have an account? Sign in to continue where you left off
                      </p>
                      <button
                        onClick={handleModeToggle}
                        className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-primary transition-all"
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="h-10 w-10 text-white" />
                      </div>
                      <h2 className="text-4xl font-bold mb-4">New Here?</h2>
                      <p className="text-white/80 mb-8 max-w-xs mx-auto leading-relaxed">
                        Join our community and discover amazing connections waiting for you
                      </p>
                      <button
                        onClick={handleModeToggle}
                        className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-primary transition-all"
                      >
                        Create Account
                      </button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}