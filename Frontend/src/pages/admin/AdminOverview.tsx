import { useMemo } from "react";
import { Package, CalendarDays, Users, TrendingUp, IndianRupee, UtensilsCrossed, Clock } from "lucide-react";
import { useOrders } from "@/context/OrderContext";
import { menuItems } from "@/data/menuData";

const AdminOverview = () => {
  const { orders, reservations } = useOrders();
  
  const activeCustomers = useMemo(() => {
    const uniquePhones = new Set(orders.map(o => o.contact.phone));
    reservations.forEach(r => uniquePhones.add(r.phone));
    return uniquePhones.size;
  }, [orders, reservations]);

  const totalRevenue = useMemo(() => 
    orders.reduce((s, o) => o.status !== "cancelled" ? s + o.totalPrice : s, 0),
  [orders]);

  const stats = [
    { label: "Total Orders", value: orders.length, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Net Revenue", value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50" },
    { label: "Confirmed Res.", value: reservations.filter((r) => r.status === "confirmed").length, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Customers", value: activeCustomers, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Menu Items", value: menuItems.length, icon: UtensilsCrossed, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Avg Order", value: orders.length > 0 ? `₹${Math.round(totalRevenue / orders.length)}` : '₹0', icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  const recentOrders = useMemo(() => [...orders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [orders]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    preparing: "bg-orange-100 text-orange-700 border-orange-200",
    ready: "bg-green-50 text-green-700 border-green-100",
    delivered: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">Real-time performance metrics at a glance</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-body font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="font-body text-2xl font-bold tracking-tight">{s.value}</p>
            <p className="font-body text-[11px] uppercase tracking-wider font-bold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Recent Activities</h2>
          <button className="font-body text-sm text-primary font-semibold hover:underline">View All Orders</button>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-body text-muted-foreground font-medium">No order activity recorded yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-body text-xs font-bold text-muted-foreground uppercase tracking-widest p-4">Order ID</th>
                    <th className="text-left font-body text-xs font-bold text-muted-foreground uppercase tracking-widest p-4 hidden md:table-cell">Customer</th>
                    <th className="text-left font-body text-xs font-bold text-muted-foreground uppercase tracking-widest p-4 hidden lg:table-cell">Type</th>
                    <th className="text-left font-body text-xs font-bold text-muted-foreground uppercase tracking-widest p-4">Total</th>
                    <th className="text-right font-body text-xs font-bold text-muted-foreground uppercase tracking-widest p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                      <td className="font-body text-sm p-4">
                        <span className="font-bold">#{o.id}</span>
                        <div className="md:hidden text-[10px] text-muted-foreground mt-0.5">{o.contact.name}</div>
                      </td>
                      <td className="font-body text-sm p-4 text-foreground font-medium hidden md:table-cell">
                        {o.contact.name}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className={`font-body text-[10px] px-2 py-0.5 rounded-full border w-fit ${o.orderType === "Online" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>
                            {o.orderType}
                          </span>
                          <span className="font-body text-[9px] text-muted-foreground mt-1 font-bold">{o.payment}</span>
                        </div>
                      </td>
                      <td className="font-body text-sm p-4 font-bold text-primary">₹{o.totalPrice.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-block font-body text-[10px] px-3 py-1 rounded-full capitalize font-bold border shadow-sm ${statusColors[o.status.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
