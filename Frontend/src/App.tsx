import { lazy, Suspense } from "react";
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

// Lazy load pages
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

// Admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminTableOrders = lazy(() => import("./pages/admin/AdminTableOrders"));

// User pages
const UserLayout = lazy(() => import("./pages/user/UserLayout"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const UserOrders = lazy(() => import("./pages/user/UserOrders"));
const UserReservations = lazy(() => import("./pages/user/UserReservations"));
const UserTableOrder = lazy(() => import("./pages/user/UserTableOrder"));

const queryClient = new QueryClient();

const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner text="Checking authentication..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

// Admin Route
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner text="Verifying admin access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
};

// ✅ Separated component (now safely inside AuthProvider)
const AppContent = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />
      <CartDrawer />

      <Suspense fallback={<LoadingSpinner text="Loading page..." />}>
        <Routes>
          {/* Public */}
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

          {/* User */}
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

          {/* Admin */}
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

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <Footer />
    </BrowserRouter>
  );
};

// ✅ Clean App wrapper
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
