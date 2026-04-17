import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const LoginPage = () => {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || "/profile";

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, navigate, from]);

  // Handle Google OAuth callback
  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Check if we're on the callback URL
      const urlParams = new URLSearchParams(window.location.search);

      // Your backend redirects directly to /profile or /admin with cookies
      // So we just need to check if user is authenticated
      const isGoogleCallback = document.referrer.includes('accounts.google.com');

      if (isGoogleCallback || urlParams.get('google_auth') === 'true') {
        setGoogleLoading(true);

        try {
          // Wait a moment for cookies to be set
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if user is now logged in
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');

          if (token && userStr) {
            const user = JSON.parse(userStr);
            await login(user.email, "google-auth");
            toast.success("Welcome back!");

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Navigate based on user role
            const redirectUrl = user.role === 'admin' ? '/admin' : from;
            navigate(redirectUrl, { replace: true });
          } else {
            // Fetch current user if needed
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/users/current-user`, {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data.data) {
                localStorage.setItem('user', JSON.stringify(data.data));
                if (data.data.token) localStorage.setItem('token', data.data.token);
                await login(data.data.email, "google-auth");
                toast.success("Welcome back!");

                const redirectUrl = data.data.role === 'admin' ? '/admin' : from;
                navigate(redirectUrl, { replace: true });
              }
            }
          }
        } catch (error) {
          console.error("Google callback error:", error);
          toast.error("Failed to complete Google sign in");
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setGoogleLoading(false);
        }
      }
    };

    handleGoogleCallback();
  }, [navigate, from, login]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
  };

  const loginWithGoogle = () => {
    if (googleLoading) return;
    setGoogleLoading(true);

    // Store current path to return after authentication
    localStorage.setItem("googleAuthReturnUrl", window.location.pathname);

    // Redirect to your Google auth endpoint
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
    window.location.href = `${import.meta.env.VITE_GOOGLE_CALLBACK_URL}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return null;
  }

  return (
    <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md animate-fade-in-up px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold mb-3 animate-fade-in-down">
            Welcome Back
          </h1>
          <p className="font-body text-muted-foreground animate-fade-in-up stagger-1">
            Sign in to access your orders and reservations
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-5 hover-lift animate-scale-in">
          {/* Google Sign-In Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="w-full font-body gap-3 h-11 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow group"
              onClick={loginWithGoogle}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span className="text-gray-700 font-medium">
                    Redirecting to Google...
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.67-.35-1.41-.35-2.18s.13-1.51.35-2.18V6.9H2.18C1.43 8.44 1 10.17 1 12s.43 3.56 1.18 5.1l3.66-2.85z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.9l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-gray-700 font-medium group-hover:text-gray-900">
                    Continue with Google
                  </span>
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground font-body">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="font-body text-sm font-medium text-foreground mb-1 block">
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    errors.email ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="email"
                  disabled={loading || googleLoading}
                />
              </div>
              {errors.email && (
                <p className="font-body text-xs text-destructive mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="font-body text-sm font-medium text-foreground mb-1 block">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    errors.password ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="current-password"
                  disabled={loading || googleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="font-body text-xs text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-body"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              id="login-submit"
              type="submit"
              className="w-full font-body gap-2 h-11"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Terms and Privacy */}
        <p className="text-center text-xs text-muted-foreground font-body mt-6">
          By signing in, you agree to our{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </p>

        {/* Sign Up Link */}
        <p className="text-center font-body text-sm text-muted-foreground mt-3">
          Don't have an account?{" "}
          <Link
            to="/signup"
            state={location.state}
            className="text-primary hover:underline font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
