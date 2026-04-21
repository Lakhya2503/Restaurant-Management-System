import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/context/OrderContext";
import { useTableOrders, type TableOrder, type TableOrderItem } from "@/context/TableOrderContext";
import { X, Package, Pencil, Trash2, UtensilsCrossed, Minus, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Order } from "@/context/OrderContext";

const statusColor: Record<string, string> = {
  pending: "bg-primary/20 text-primary",
  preparing: "bg-yellow-100 text-yellow-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-green-200 text-green-800",
  cancelled: "bg-destructive/20 text-destructive",
  active: "bg-blue-100 text-blue-700",
  served: "bg-green-100 text-green-700",
  completed: "bg-green-200 text-green-800",
};

const UserOrders = () => {
  const { user } = useAuth();
  const { getUserOrders, updateOrderStatus } = useOrders();
  const { tableOrders, updateTableOrder, deleteTableOrder } = useTableOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userTableOrders, setUserTableOrders] = useState<TableOrder[]>([]);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState<TableOrder | null>(null);
  const [editTableNumber, setEditTableNumber] = useState<number>(1);
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<TableOrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<"online" | "table">("online");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use refs to track if we've loaded data and to prevent unnecessary updates
  const hasLoadedRef = useRef(false);
  const prevTableOrdersRef = useRef<TableOrder[]>([]);
  const prevUserOrdersRef = useRef<Order[]>([]);

  // Separate function to get online orders
  const getOnlineOrders = useCallback(() => {
    if (!user) return [];
    const allOrders = getUserOrders(user.id);
    return allOrders.filter(o =>
      String(o.orderType || "Home Delivery").toLowerCase() === "home delivery"
    );
  }, [user, getUserOrders]);

  // Separate function to get table orders
  const getTableOrders = useCallback(() => {
    if (!user) return [];
    return tableOrders.filter((o) => o.customerName === user.name);
  }, [user, tableOrders]);

  // Function to refresh all order data - only called manually or on specific events
  const refreshAllOrders = useCallback(() => {
    if (!user) return;

    setIsRefreshing(true);

    // Get fresh data
    const newOnlineOrders = getOnlineOrders();
    const newTableOrders = getTableOrders();

    setOrders(newOnlineOrders);
    setUserTableOrders(newTableOrders);

    setIsRefreshing(false);
  }, [user, getOnlineOrders, getTableOrders]);

  console.log("UserTableOrders", userTableOrders)

  userTableOrders.map((item)=>{
        console.log(item)
  })

  // Initial load only - runs once
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      refreshAllOrders();
      hasLoadedRef.current = true;
    }
  }, [user, refreshAllOrders]);

  // Listen only for specific events that require refresh (user actions)
  useEffect(() => {
    const handleOrderUpdate = () => {
      console.log("Order update event, refreshing...");
      refreshAllOrders();
    };

    // Only essential events
    window.addEventListener("ordersUpdated", handleOrderUpdate);
    window.addEventListener("tableOrdersUpdated", handleOrderUpdate);
    window.addEventListener("checkoutComplete", handleOrderUpdate);
    window.addEventListener("orderPlaced", handleOrderUpdate);

    return () => {
      window.removeEventListener("ordersUpdated", handleOrderUpdate);
      window.removeEventListener("tableOrdersUpdated", handleOrderUpdate);
      window.removeEventListener("checkoutComplete", handleOrderUpdate);
      window.removeEventListener("orderPlaced", handleOrderUpdate);
    };
  }, [refreshAllOrders]);

  const canCancelOrder = (order: Order) => {
    return order.status === "pending" || order.status === "preparing";
  };

  const handleCancelOrder = (orderId: string) => {
    updateOrderStatus(orderId, "cancelled");
    // Manually update local state to avoid re-fetch
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: "cancelled" }
          : order
      )
    );
    toast.success("Order cancelled successfully");
    setCancelOrderId(null);
    window.dispatchEvent(new Event("ordersUpdated"));
  };

  const handleDeleteTableOrder = (orderId: string) => {
    deleteTableOrder(orderId);
    // Manually update local state
    setUserTableOrders(prev => prev.filter(order => order.id !== orderId));
    toast.success("Table order deleted successfully");
    setDeleteOrderId(null);
    window.dispatchEvent(new Event("tableOrdersUpdated"));
  };

  const openEditDialog = (order: TableOrder) => {
    setEditOrder(order);
    setEditTableNumber(order.tableNumber);
    setEditNotes(order.notes);
    setEditItems(order.items.map((item) => ({ ...item })));
  };

  const handleEditItemQty = (itemId: string, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleSaveEdit = () => {
    if (!editOrder) return;
    if (editItems.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }
    if (editTableNumber < 1) {
      toast.error("Please enter a valid table number");
      return;
    }
    const totalPrice = editItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    updateTableOrder(editOrder.id, {
      tableNumber: editTableNumber,
      notes: editNotes,
      items: editItems,
      totalPrice,
    });

    // Update local state manually
    setUserTableOrders(prev =>
      prev.map(order =>
        order.id === editOrder.id
          ? {
              ...order,
              tableNumber: editTableNumber,
              notes: editNotes,
              items: editItems,
              totalPrice,
            }
          : order
      )
    );

    toast.success("Table order updated successfully");
    setEditOrder(null);
    window.dispatchEvent(new Event("tableOrdersUpdated"));
  };

  const handleManualRefresh = () => {
    refreshAllOrders();
  };

  const totalCount = orders.length + userTableOrders.length;

  if (totalCount === 0 && hasLoadedRef.current) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold mb-2">No Orders Yet</h2>
        <p className="font-body text-muted-foreground mb-6">Start ordering delicious food from our menu!</p>
        <Button onClick={() => (window.location.href = "/menu")} className="bg-primary text-primary-foreground font-body">
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">My Orders</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {totalCount} total orders
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "online" ? "default" : "outline"}
          onClick={() => setActiveTab("online")}
          className="font-body gap-2"
        >
          <Package className="w-4 h-4" /> Online Orders ({orders.length})
        </Button>
        <Button
          variant={activeTab === "table" ? "default" : "outline"}
          onClick={() => setActiveTab("table")}
          className="font-body gap-2"
        >
          <UtensilsCrossed className="w-4 h-4" /> Table Orders ({userTableOrders.length})
        </Button>
      </div>

      {/* Online Orders */}
      {activeTab === "online" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-body text-muted-foreground">No online orders yet.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-xl p-5">

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-body text-lg font-bold">ONLINE{String(order.id).slice(14).toUpperCase()}</h3>
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${statusColor[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="font-body text-sm text-muted-foreground mb-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">Payment: {order.payment}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-2xl font-bold text-primary">₹{order.totalPrice}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mb-4">
                  <h4 className="font-body text-sm font-semibold mb-2">Items:</h4>
                  <div className="flex flex-wrap gap-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/40 p-2 rounded-xl border border-border/50">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-muted"
                            onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop")}
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="font-body text-xs font-bold">{item.name}</span>
                          <span className="font-body text-[10px] text-muted-foreground uppercase tracking-tight">×{item.qty} · ₹{item.price * item.qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4 mb-4">
                  <h4 className="font-body text-sm font-semibold mb-2">Delivery Details:</h4>
                  <p className="font-body text-sm text-muted-foreground">{order.contact.name}</p>
                  <p className="font-body text-sm text-muted-foreground">{order.contact.phone}</p>
                  <p className="font-body text-sm text-muted-foreground">{order.contact.address}</p>
                </div>

                {order.cancellationReason && (
                  <div className="border-t border-border pt-4 mb-4">
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="font-body text-sm text-destructive">
                        <strong>Cancellation Reason:</strong> {order.cancellationReason}
                      </p>
                    </div>
                  </div>
                )}

                {canCancelOrder(order) && (
                  <div className="border-t border-border pt-4">
                    <Button variant="destructive" size="sm" onClick={() => setCancelOrderId(order.id)} className="font-body gap-2">
                      <X className="w-4 h-4" /> Cancel Order
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Table Orders */}
      {activeTab === "table" && (
        <div className="space-y-4">
          {userTableOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-body text-muted-foreground">No table orders yet.</p>
            </div>
          ) : (
            userTableOrders.map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-body text-lg font-bold">TABLE{String(order.id).slice(14).toUpperCase()}</h3>
                      <span className="font-body text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                        Table {order.tableNumber}
                      </span>
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${statusColor[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="font-body text-sm text-muted-foreground mb-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                    {order.notes && (
                      <p className="font-body text-sm text-muted-foreground italic">Note: {order.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-body text-2xl font-bold text-primary">₹{order.totalPrice}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mb-4">
                  <h4 className="font-body text-sm font-semibold mb-2">Items:</h4>
                  <div className="flex flex-wrap gap-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/40 p-2 rounded-xl border border-border/50">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-muted"
                            onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop")}
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="font-body text-xs font-bold">{item.name}</span>
                          <span className="font-body text-[10px] text-muted-foreground uppercase tracking-tight">×{item.qty} · ₹{item.price * item.qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit / Delete only for active orders */}
                {order.status === "active" && (
                  <div className="border-t border-border pt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(order)} className="font-body gap-2">
                      <Pencil className="w-4 h-4" /> Edit Order
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteOrderId(order.id)} className="font-body gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Order
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Cancel Online Order Dialog */}
      <AlertDialog open={!!cancelOrderId} onOpenChange={() => setCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelOrderId && handleCancelOrder(cancelOrderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Table Order Dialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this table order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderId && handleDeleteTableOrder(deleteOrderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Table Order Dialog */}
      <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Table Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="font-body text-sm font-semibold mb-1 block">Table Number</label>
              <Input
                type="number"
                min={1}
                value={editTableNumber}
                onChange={(e) => setEditTableNumber(Number(e.target.value))}
                className="font-body"
              />
            </div>

            <div>
              <label className="font-body text-sm font-semibold mb-1 block">Special Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any special requests..."
                className="font-body"
              />
            </div>

            <div>
              <label className="font-body text-sm font-semibold mb-2 block">Items</label>
              <div className="space-y-2">
                {editItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium">{item.name}</p>
                      <p className="font-body text-xs text-muted-foreground">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditItemQty(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-body text-sm w-6 text-center">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditItemQty(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {editItems.length === 0 && (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No items remaining. Add at least one item.</p>
                )}
              </div>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-body font-semibold">Total:</span>
              <span className="font-body text-xl font-bold text-primary">
                ₹{editItems.reduce((sum, item) => sum + item.price * item.qty, 0)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOrder(null)} className="font-body">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="font-body">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrders;
