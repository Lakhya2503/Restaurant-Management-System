import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Camera, X, Eye, EyeOff, Mail, Lock, Phone, User } from "lucide-react";
import { toast } from "sonner";

// Google Client ID not needed for redirect-based flow

const SignupPage = () => {
  const { signup, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/profile";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    adminSuperKey: "",
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoggedIn) {
    navigate(from, { replace: true });
    return null;
  }


 const loginWithGoogle = () => {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const popup = window.open(
    `${apiBase}/restaurant/api/v1/auth/callback/google`,
    "google-login",
    "width=500,height=650"
  );

  const timer = setInterval(() => {
    if (popup?.closed) {
      clearInterval(timer);
      window.location.reload();
    }
  }, 500);
};

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
    else if (!/^\d{7,15}$/.test(form.phoneNumber.replace(/\s/g, "")))
      e.phoneNumber = "Enter a valid phone number (digits only)";
    return e;
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
      await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: Number(form.phoneNumber.replace(/\s/g, "")),
        adminSuperKey: form.adminSuperKey.trim() || undefined,
      });

      toast.success("Account created successfully!");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Google login handled via redirect

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md animate-fade-in-up px-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold mb-3 animate-fade-in-down">
            Create Account
          </h1>
          <p className="font-body text-muted-foreground animate-fade-in-up stagger-1">
            Join us to order, reserve, and more
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-5 hover-lift animate-scale-in">
          {/* Google Sign-Up */}
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
                or sign up with details
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <Camera className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-body text-xs text-primary hover:underline"
              >
                {avatar ? "Change photo" : "Upload profile photo (optional)"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Rahul Sharma"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    errors.fullName ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="name"
                />
              </div>
              {errors.fullName && (
                <p className="font-body text-xs text-destructive mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="rahul@example.com"
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

            {/* Phone */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="9876543210"
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    errors.phoneNumber ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="tel"
                />
              </div>
              {errors.phoneNumber && (
                <p className="font-body text-xs text-destructive mt-1">
                  {errors.phoneNumber}
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
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    errors.password ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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



            {/* Admin Super Key (Optional) */}
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1 block">
                Admin Super Key{" "}
                <span className="font-body text-xs text-muted-foreground">
                  (optional)
                </span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="signup-admin-key"
                  type="password"
                  placeholder="Only for administrators"
                  value={form.adminSuperKey}
                  onChange={(e) => set("adminSuperKey", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  autoComplete="off"
                />
              </div>
            </div>

            <Button
              id="signup-submit"
              type="submit"
              className="w-full font-body gap-2 h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center font-body text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            state={location.state}
            className="text-primary hover:underline font-semibold"
          >
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground font-body mt-2">
          By signing up, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  );
};

export default SignupPage;
