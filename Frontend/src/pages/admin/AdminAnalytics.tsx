import { useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, ShoppingBag, IndianRupee, PieChart as PieChartIcon } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))", 
  "hsl(var(--primary) / 0.8)", 
  "hsl(var(--primary) / 0.6)", 
  "hsl(var(--primary) / 0.4)", 
  "hsl(var(--primary) / 0.2)"
];

const AdminAnalytics = () => {
  const { orders } = useOrders();

  // 1. Calculate Weekly Revenue data
  const revenueData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return {
        key: d.toISOString().split("T")[0],
        day: days[d.getDay()],
        revenue: 0,
        sortKey: d.getTime()
      };
    }).sort((a, b) => a.sortKey - b.sortKey);

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
      const dayData = last7Days.find(d => d.key === orderDate);
      if (dayData && order.status !== "cancelled") {
        dayData.revenue += order.totalPrice;
      }
    });

    return last7Days.map(({ day, revenue }) => ({ day, revenue }));
  }, [orders]);

  // 2. Calculate Order Status breakdown
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [orders]);

  // 3. Calculate Top Dishes
  const topDishes = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};
    orders.forEach(order => {
      if (order.status === "cancelled") return;
      order.items.forEach(item => {
        if (!counts[item.name]) {
          counts[item.name] = { count: 0, name: item.name };
        }
        counts[item.name].count += item.qty;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  const totalRevenue = orders.reduce((acc, curr) => curr.status !== "cancelled" ? acc + curr.totalPrice : acc, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Analytics & Insights</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">Comprehensive view of your restaurant's performance</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-xl">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-body text-sm font-semibold text-foreground">Revenue: ₹{totalRevenue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">Weekly Revenue Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} className="font-body text-xs" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                className="font-body text-xs" 
                tick={{fill: 'hsl(var(--muted-foreground))'}}
                tickFormatter={(value) => `₹${value > 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} 
              />
              <Tooltip
                cursor={{fill: 'hsl(var(--primary) / 0.05)'}}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))", 
                  borderRadius: "12px", 
                  fontFamily: "DM Sans",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                }}
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PieChartIcon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">Order Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie 
                data={statusData} 
                cx="50%" 
                cy="50%" 
                innerRadius={60}
                outerRadius={100} 
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  fontFamily: "DM Sans", 
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                }} 
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Dishes */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">Best Sellers (Items Sold)</h2>
        </div>
        
        {topDishes.length === 0 ? (
          <p className="font-body text-center py-10 text-muted-foreground">No data available yet</p>
        ) : (
          <div className="space-y-6">
            {topDishes.map((dish, i) => (
              <div key={dish.name} className="relative">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center font-display text-sm font-bold bg-primary/10 text-primary w-8 h-8 rounded-lg">
                      {i + 1}
                    </span>
                    <span className="font-body font-bold text-foreground">{dish.name}</span>
                  </div>
                  <div className="flex-1 md:text-right">
                    <span className="font-body text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {dish.count} units sold
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${(dish.count / topDishes[0].count) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
