import { User, Package, CalendarDays, LogOut, Home, X, UtensilsCrossed } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "My Orders", url: "/profile/orders", icon: Package },
  { title: "Table Order", url: "/profile/table-order", icon: UtensilsCrossed },
  { title: "My Reservations", url: "/profile/reservations", icon: CalendarDays },
];

export function UserSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    if (isMobile) setOpenMobile(false);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-orange-200/70 bg-gradient-to-b from-white via-orange-50/30 to-white"
    >
      <SidebarHeader>
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-orange-200/70 bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <img src="/Athenura%20logo.png" alt="Athenura" className="h-7 w-auto object-contain" />
              <h2 className="font-display text-base font-bold">My Account</h2>
            </div>
            <button
              onClick={() => setOpenMobile(false)}
              className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="pt-4">
        {!collapsed && !isMobile && (
          <div className="px-3 mb-4">
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-100/70 via-orange-50/70 to-white p-4">
              <p className="font-body text-[10px] tracking-[0.18em] uppercase text-orange-700">Welcome Back</p>
              <h2 className="font-display text-lg font-bold mt-1">My Account</h2>
              <p className="font-body text-xs text-muted-foreground mt-1 truncate">{user?.name}</p>
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] tracking-[0.18em] uppercase text-orange-700/80">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/profile"}
                      className="rounded-xl px-3 py-2.5 hover:bg-orange-100 hover:text-orange-700 transition-all"
                      activeClassName="rounded-xl bg-gradient-to-r from-orange-200/60 to-orange-100/50 text-orange-800 font-semibold border border-orange-300/70 shadow-sm"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-orange-200/70 p-2 bg-white/90">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/" className="rounded-xl px-3 py-2.5 hover:bg-orange-100 hover:text-orange-700 transition-all" onClick={handleNavClick}>
                <Home className="mr-2 h-4 w-4" />
                {!collapsed && <span>Back to Home</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="rounded-xl px-3 py-2.5 hover:bg-destructive/10 hover:text-destructive transition-all">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
