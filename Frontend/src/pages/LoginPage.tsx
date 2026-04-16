import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, Eye, EyeOff, Mail, Lock } from "lucide-react";
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
  const [googlePopup, setGooglePopup] = useState<Window | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, navigate, from]);

  // Listen for messages from Google popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Verify origin for security
      if (event.origin !== apiBase) return;

      // Handle successful authentication
      if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
        const { token, user } = event.data.payload;

        try {
          // Store the token
          localStorage.setItem("token", token);

          // Call login with the user data
          await login(user.email, "google-auth");

          toast.success("Welcome back!");
          navigate(from, { replace: true });
        } catch (err) {
          toast.error("Failed to complete Google sign in");
        } finally {
          if (googlePopup && !googlePopup.closed) {
            googlePopup.close();
          }
          setGooglePopup(null);
        }
      }

      // Handle error
      if (event.data.type === "GOOGLE_AUTH_ERROR") {
        toast.error(event.data.payload.error || "Google sign in failed");
        if (googlePopup && !googlePopup.closed) {
          googlePopup.close();
        }
        setGooglePopup(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [googlePopup, login, navigate, from]);

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    return e;
  };

  const loginWithGoogle = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // Calculate center position
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2; 

    // Open popup
    const popup = window.open(
      `${apiBase}/restaurant/api/v1/auth/callback/google`,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    setGooglePopup(popup);

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      toast.error("Popup was blocked. Please allow popups for this site.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      toast.error(msg);
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
          {/* Google Sign-In */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="w-full font-body gap-3 h-11 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow group"
              onClick={loginWithGoogle}
            >
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
            </Button>
          </div>

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

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
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
                />
              </div>
              {errors.email && (
                <p className="font-body text-xs text-destructive mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
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

            <Button
              id="login-submit"
              type="submit"
              className="w-full font-body gap-2 h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              )}
            </Button>
          </form>

          {/* Dev-only admin shortcut */}
          {import.meta.env.DEV && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
            </div>
          )}
        </div>

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
