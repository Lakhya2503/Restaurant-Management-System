import { useState, useEffect } from "react";
import { useOrders } from "@/context/OrderContext";
import type { Order } from "@/context/OrderContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const cancellationReasons = [
  "Customer requested cancellation",
  "Items out of stock",
  "Unable to deliver to location",
  "Payment issue",
  "Duplicate order",
  "Other reason",
];

const statusOptions = ["pending", "preparing", "ready", "delivered", "cancelled", "active"] as const;

const statusColor: Record<string, string> = {
  pending: "bg-primary/20 text-primary",
  preparing: "bg-yellow-100 text-yellow-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-green-200 text-green-800",
  cancelled: "bg-destructive/20 text-destructive",
  active: "bg-blue-100 text-blue-700",
};

const AdminOrders = () => {
  const { orders: allOrders, updateOrderStatus } = useOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    setOrders(allOrders);
  }, [allOrders]);

  const deliveryOrders = orders.filter((o) => String(o.orderType).toLowerCase() === "home delivery");
  const filtered = filter === "all" ? deliveryOrders : deliveryOrders.filter((o) => o.status === filter);

  const updateStatus = (id: string, status: Order["status"]) => {
    if (status === "cancelled") {
      setSelectedOrderId(id);
      setCancelDialogOpen(true);
    } else {
      updateOrderStatus(id, status);
      setOrders(allOrders);
    }
  };

  const handleCancelOrder = () => {
    if (!selectedOrderId || !cancellationReason) {
      toast.error("Please select a cancellation reason");
      return;
    }
    updateOrderStatus(selectedOrderId, "cancelled", cancellationReason);
    setOrders(allOrders);
    toast.success("Order cancelled successfully");
    setCancelDialogOpen(false);
    setSelectedOrderId(null);
    setCancellationReason("");
  };
  return (
    <div>
      <div className="flex flex-col mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Online Orders</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">Manage online orders and delivery logistics.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["all", ...statusOptions].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`font-body text-xs font-medium px-3 py-1.5 rounded-full border transition-colors capitalize ${
              filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"
            }`}
          >
            {s} {s !== "all" && `(${deliveryOrders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-xl p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-body text-sm font-bold">{order.id}</h3>
                  <span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${statusColor[order.status]}`}>{order.status}</span>
                  {order.orderType && (
                    <span className="font-body text-xs px-2 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary-foreground border border-secondary/20">
                      {order.orderType}
                    </span>
                  )}
                </div>
                {order.orderType === "Table Order" ? (
                  <p className="font-body text-xs text-muted-foreground font-semibold text-orange-600 mb-1">
                    Table No: {order.tableNo} · {order.contact.name || "Walk-in"}
                  </p>
                ) : (
                  <>
                    <p className="font-body text-xs text-muted-foreground">{order.contact.name} · {order.contact.phone}</p>
                    <p className="font-body text-xs text-muted-foreground">{order.contact.address}</p>
                  </>
                )}
                <p className="font-body text-xs text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleString()} · {order.payment}</p>
              </div>
              <div className="text-right">
                <p className="font-body text-lg font-bold text-primary">₹{order.totalPrice.toFixed(0)}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 mb-3">
              <div className="flex flex-wrap gap-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/30 p-2 rounded-xl border border-transparent hover:border-border transition-all">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-10 h-10 rounded-lg object-cover bg-muted" 
                        onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop")}
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-body text-xs font-semibold">{item.name} ×{item.qty}</span>
                      <span className="font-body text-[10px] text-muted-foreground whitespace-nowrap">₹{(item.price * item.qty).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(order.id, s)}
                  disabled={order.status === s}
                  className={`font-body text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                    order.status === s
                      ? "bg-primary/10 text-primary border-primary cursor-default"
                      : "bg-card text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            {order.cancellationReason && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-body text-xs text-destructive">
                  <strong>Cancellation Reason:</strong> {order.cancellationReason}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="font-body text-sm text-muted-foreground">
              Please select a reason for cancelling this order:
            </p>
            <div className="space-y-2">
              {cancellationReasons.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    cancellationReason === reason
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={reason}
                    checked={cancellationReason === reason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="font-body text-sm">{reason}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedOrderId(null);
                setCancellationReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCancelOrder}
              disabled={!cancellationReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
