import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Package, CalendarDays, Edit2, Camera, User as UserIcon, Phone } from "lucide-react";
import { useOrders } from "@/context/OrderContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const ProfilePage = () => {
  const { user, isLoggedIn, logout, updateProfile, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const { getUserOrders, getUserReservations } = useOrders();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [newPhone, setNewPhone] = useState(user?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoggedIn || !user) {
    navigate("/login");
    return null;
  }

  const allUserOrders = getUserOrders(user.id);
  const [activeTab, setActiveTab] = useState<"all" | "delivery" | "table">("all");
  
  const homeDeliveryOrders = allUserOrders.filter(o => String(o.orderType).toLowerCase() === "home delivery");
  const tableOrders = allUserOrders.filter(o => String(o.orderType).toLowerCase() === "table order");
  const userReservations = getUserReservations(user.id);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    preparing: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-700",
    delivered: "bg-green-200 text-green-800",
    cancelled: "bg-destructive/20 text-destructive",
    confirmed: "bg-primary/20 text-primary",
    completed: "bg-green-200 text-green-800",
  };

  const handleUpdateProfile = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile(newName, newPhone);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsLoading(true);
    try {
      await updateAvatar(file);
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update avatar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="pt-24 pb-20 min-h-screen bg-background">
      <div className="container max-w-3xl">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 mb-8 relative overflow-hidden group">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          
          <div className="relative">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-24 h-24 rounded-full bg-muted object-cover ring-4 ring-background shadow-lg" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-all border-2 border-background"
              title="Change Avatar"
              disabled={isLoading}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
          </div>

          <div className="text-center md:text-left flex-1 z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold">{user.name}</h1>
              <span className="inline-block font-body text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize self-center">
                {user.role}
              </span>
            </div>
            <p className="font-body text-muted-foreground text-sm mb-1">{user.email}</p>
            {user.phone && <p className="font-body text-muted-foreground text-xs">{user.phone}</p>}
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-body gap-2 text-xs h-8">
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Your phone number"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUpdateProfile} disabled={isLoading} className="w-full">
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="font-body gap-2 text-xs h-8 text-destructive hover:bg-destructive/10">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Header with Tabs */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4 px-2">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> My Orders
            </h2>
            <div className="flex bg-muted p-1 rounded-xl">
              {(["all", "delivery", "table"] as const).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-body font-medium transition-all capitalize ${activeTab === tab ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab} ({tab === "all" ? allUserOrders.length : tab === "delivery" ? homeDeliveryOrders.length : tableOrders.length})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === "all" && allUserOrders.length === 0 && <p className="font-body text-muted-foreground text-sm py-8 text-center bg-card rounded-2xl border border-dashed border-border">No orders yet.</p>}
            {activeTab === "delivery" && homeDeliveryOrders.length === 0 && <p className="font-body text-muted-foreground text-sm py-8 text-center bg-card rounded-2xl border border-dashed border-border">No online delivery orders yet.</p>}
            {activeTab === "table" && tableOrders.length === 0 && <p className="font-body text-muted-foreground text-sm py-8 text-center bg-card rounded-2xl border border-dashed border-border">No table orders yet.</p>}

            {(activeTab === "all" ? allUserOrders : activeTab === "delivery" ? homeDeliveryOrders : tableOrders).map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-body text-sm font-bold tracking-tight">{order.id}</p>
                    <span className={`font-body text-[10px] px-2 py-0.5 rounded-full border shadow-sm ${
                      String(order.orderType).toLowerCase() === "table order" 
                        ? "bg-orange-50 text-orange-700 border-orange-100" 
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      {String(order.orderType).toLowerCase() === "table order" ? `Table #${order.tableNo}` : "Home Delivery"}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-10 h-10 rounded-lg object-cover bg-muted ring-1 ring-border" 
                            onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop")}
                          />
                        )}
                        <div className="flex flex-col leading-tight pr-2">
                          <span className="font-body text-[11px] font-bold text-foreground">{item.name} <span className="text-primary">×{item.qty}</span></span>
                          <span className="font-body text-[9px] text-muted-foreground font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 min-w-[120px] pt-2 md:pt-0 border-t md:border-t-0 border-border md:border-none">
                  <span className="font-body text-base font-bold text-primary">₹{order.totalPrice}</span>
                  <span className={`font-body text-[11px] px-3 py-1 rounded-full capitalize font-semibold shadow-sm ${statusColor[order.status]}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past Reservations */}
        <section>
          <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-6 px-2">
            <CalendarDays className="w-5 h-5 text-primary" /> My Reservations
          </h2>
          {userReservations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
              <p className="font-body text-muted-foreground text-sm">No reservations yet.</p>
              <Button variant="link" onClick={() => navigate("/reservation")} className="text-xs">Book a Table</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userReservations.map((res) => (
                <div key={res.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-all group overflow-hidden relative">
                  {/* Status indicator pill on background */}
                  <div className={`absolute top-0 right-0 w-1 h-full ${
                    res.status === "confirmed" ? "bg-green-400" : 
                    res.status === "pending" ? "bg-yellow-400" : "bg-destructive/40"
                  }`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-body text-sm font-bold">{res.id}</p>
                      <span className="font-body text-[11px] text-primary bg-primary/5 px-2 py-0.5 rounded-full font-bold">
                        {res.guests} {res.guests === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-body text-xs font-medium text-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {res.date} <span className="text-muted-foreground mx-1">at</span> <span className="text-primary font-bold">{res.time}</span>
                      </p>
                      {res.notes && <p className="font-body text-[10px] text-muted-foreground italic bg-muted/20 p-2 rounded-lg mt-1 border border-border/50">"{res.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3">
                    <span className={`font-body text-[11px] px-3 py-1 rounded-full capitalize font-bold shadow-sm ${statusColor[res.status]}`}>
                      {res.status}
                    </span>
                    {res.assignedTable && (
                      <span className="font-body text-[10px] font-bold text-muted-foreground">Table: <span className="text-primary">#{res.assignedTable}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
