import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserSidebar } from "@/components/UserSidebar";
import { useEffect } from "react";

const UserLayout = () => {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn || !user) {
      navigate("/login", { state: { from: location.pathname }, replace: true });
    } else if (user.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [isLoggedIn, user, navigate, location.pathname]);

  if (!isLoggedIn || !user || user.role === "admin") return null;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-white">
      <SidebarProvider>
        <div className="min-h-[calc(100vh-5rem)] flex w-full">
          <UserSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-14 flex items-center gap-3 border-b border-orange-200/70 px-4 bg-gradient-to-r from-white via-orange-50/50 to-white backdrop-blur-sm">
              <SidebarTrigger />
              <h1 className="font-display text-lg font-semibold text-orange-900">Dashboard</h1>
            </div>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default UserLayout;
