import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OrderProvider } from "@/context/OrderContext";
import { TableOrderProvider } from "@/context/TableOrderContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import { Loader2 } from "lucide-react";

// Lazy load page components for better performance
const Index = lazy(() => import("./pages/Index"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const DishDetailPage = lazy(() => import("./pages/DishDetailPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages lazy loading
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminTableOrders = lazy(() => import("./pages/admin/AdminTableOrders"));

// User pages lazy loading
const UserLayout = lazy(() => import("./pages/user/UserLayout"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const UserOrders = lazy(() => import("./pages/user/UserOrders"));
const UserReservations = lazy(() => import("./pages/user/UserReservations"));
const UserTableOrder = lazy(() => import("./pages/user/UserTableOrder"));

// Create QueryClient with optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading spinner component
const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  </div>
);

// Skeleton loader for better UX
const PageSkeleton = () => (
  <div className="min-h-screen animate-pulse">
    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-b-xl" />
    <div className="container mx-auto px-4 py-8">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

// Error Boundary Component
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Lazy loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8 max-w-md">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Failed to load this page. Please try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner text="Checking authentication..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner text="Verifying admin access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
};

// Preload component for critical routes
const RoutePreloader = () => {
  useEffect(() => {
    // Preload menu page and home page when idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        import("./pages/MenuPage");
        import("./pages/Index");
      });
    } else {
      setTimeout(() => {
        import("./pages/MenuPage");
        import("./pages/Index");
      }, 2000);
    }

    // Preload user dashboard if user is logged in
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      setTimeout(() => {
        import("./pages/user/UserLayout");
        import("./pages/user/UserProfile");
      }, 3000);
    }
  }, []);

  return null;
};

// Main App Content
const AppContent = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RoutePreloader />
      <Header />
      <CartDrawer />

      <LazyErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/dish/:id" element={<DishDetailPage />} />
            <Route path="/reservation" element={<ReservationPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/trending" element={<TrendingPage />} />

            {/* User Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserProfile />} />
              <Route path="orders" element={<UserOrders />} />
              <Route path="table-order" element={<UserTableOrder />} />
              <Route path="reservations" element={<UserReservations />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="table-orders" element={<AdminTableOrders />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </LazyErrorBoundary>

      <Footer />
    </BrowserRouter>
  );
};

// Main App Component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <OrderProvider>
            <TableOrderProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </CartProvider>
            </TableOrderProvider>
          </OrderProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
