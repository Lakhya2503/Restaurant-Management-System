import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { orderApi, paymentApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface TableOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface TableOrder {
  id: string;
  tableNumber: number;
  customerName: string;
  items: TableOrderItem[];
  totalPrice: number;
  notes: string;
  status: "active" | "preparing" | "served" | "completed" | "cancelled" | "pending";
  createdAt: string;
}

export interface CreateTableOrderData {
  tableNumber: number;
  customerName: string;
  items: TableOrderItem[];
  totalPrice: number;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  noOfGuests: number;
}

interface TableOrderContextType {
  tableOrders: TableOrder[];
  isLoading: boolean;
  error: string | null;
  addTableOrder: (data: CreateTableOrderData) => Promise<TableOrder>;
  updateTableOrderStatus: (orderId: string, status: TableOrder["status"]) => Promise<void>;
  updateTableOrder: (orderId: string, data: Partial<Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">>) => Promise<void>;
  deleteTableOrder: (orderId: string) => Promise<void>;
  getActiveTableOrders: () => TableOrder[];
  getOrderById: (orderId: string) => TableOrder | undefined;
  refreshTableOrders: () => Promise<void>;
  clearError: () => void;
}

const TableOrderContext = createContext<TableOrderContextType | undefined>(undefined);

const TABLE_ORDERS_STORAGE_KEY = "tableOrders";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: TableOrder[];
  timestamp: number;
}

// Helper function to map backend order to TableOrder
function mapBackendToTableOrder(raw: Record<string, unknown>): TableOrder | null {
  // Check if it's a table order
  const orderType = String(raw.orderType || raw.typeOfOrder || "").toLowerCase();
  if (orderType !== "table order" && orderType !== "tableorder") {
    return null;
  }

  const rawItems = Array.isArray(raw.items) ? (raw.items as any[]) : [];
  const rawStatus = String(raw.orderStatus ?? raw.status ?? "pending").toLowerCase();

  let calculatedTotal = Number(raw.totalAmount ?? raw.totalPrice ?? 0);
  if (calculatedTotal === 0 && rawItems.length > 0) {
    calculatedTotal = rawItems.reduce((acc, i) => {
      const itemNode = (typeof i.itemId === "object" && i.itemId !== null) ? (i.itemId as any) : {};
      const price = Number(itemNode.priceOfItem ?? itemNode.price ?? i.price ?? 0);
      const q = Number(i.quantity ?? i.qty ?? 1);
      return acc + (price * q);
    }, 0);
  }

  // Map status from backend format to frontend format
  const statusMap: Record<string, TableOrder["status"]> = {
    pending: "pending",
    preparing: "preparing",
    ready: "served",
    delivered: "completed",
    completed: "completed",
    cancelled: "cancelled",
    active: "active",
    "in-progress": "preparing"
  };

  // Safely extract customer name
  let customerName = "Guest";
  if (raw.customerName) {
    customerName = String(raw.customerName);
  } else if (raw.userId && typeof raw.userId === "object") {
    customerName = String((raw.userId as any).fullName || (raw.userId as any).name || "Guest");
  }

  return {
    id: String(raw._id ?? raw.id),
    tableNumber: Number(raw.tableNo ?? raw.tableNumber ?? 0),
    customerName,
    items: rawItems.map((i) => {
      const node = (typeof i.itemId === "object" && i.itemId !== null) ? (i.itemId as any) : i;
      return {
        id: String(node._id ?? i.itemId ?? i.id ?? node.id),
        name: String(node.itemName ?? node.name ?? "Unknown Item"),
        price: Number(node.priceOfItem ?? node.price ?? 0),
        qty: Number(i.quantity ?? i.qty ?? 1),
        image: String(node.itemImage ?? node.image ?? ""),
      };
    }),
    totalPrice: calculatedTotal,
    notes: String(raw.specialNotes ?? raw.notes ?? ""),
    status: statusMap[rawStatus] || "pending",
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

export const TableOrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<CacheEntry | null>(null);
  const isMountedRef = useRef(true);

  // Check cache validity
  const isCacheValid = useCallback((): boolean => {
    if (!cacheRef.current) return false;
    const now = Date.now();
    return (now - cacheRef.current.timestamp) < CACHE_DURATION_MS;
  }, []);

  // Fetch table orders from backend
  const fetchTableOrders = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid() && cacheRef.current) {
      setTableOrders(cacheRef.current.data);
      return;
    }

    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = user?.role === "admin"
        ? await orderApi.getAllOrders()
        : await orderApi.getUserOrders();

      const rawOrders = res.data?.data?.orders ?? res.data?.data ?? res.data ?? [];

      if (Array.isArray(rawOrders)) {
        const mappedOrders = rawOrders
          .map(mapBackendToTableOrder)
          .filter((order): order is TableOrder => order !== null);

        if (isMountedRef.current) {
          setTableOrders(mappedOrders);

          // Update cache
          cacheRef.current = {
            data: mappedOrders,
            timestamp: Date.now()
          };

          // Update localStorage as backup
          localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(mappedOrders));
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Failed to fetch table orders from backend:", err);

      // Fallback to localStorage
      const saved = localStorage.getItem(TABLE_ORDERS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (isMountedRef.current) {
            setTableOrders(parsed);
            setError("Using cached data due to network error");
          }
        } catch (e) {
          console.error("Failed to parse local table orders", e);
          if (isMountedRef.current) {
            setError("Failed to load table orders");
          }
        }
      } else {
        if (isMountedRef.current) {
          setError("Failed to load table orders");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, isCacheValid]);

  // Refresh function for manual refresh
  const refreshTableOrders = useCallback(async () => {
    await fetchTableOrders(true);
  }, [fetchTableOrders]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchTableOrders();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTableOrders]);

  // Persist to localStorage when orders change
  useEffect(() => {
    if (tableOrders.length > 0) {
      const saveTimeout = setTimeout(() => {
        localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(tableOrders));
        // Update cache timestamp when local changes occur
        if (cacheRef.current) {
          cacheRef.current.data = tableOrders;
          cacheRef.current.timestamp = Date.now();
        }
      }, 100);
      return () => clearTimeout(saveTimeout);
    }
  }, [tableOrders]);

  const addTableOrder = useCallback(
    async (data: CreateTableOrderData): Promise<TableOrder> => {
      setError(null);
      let newOrder: TableOrder;

      try {
        const res = await orderApi.createTableOrder({
          typeOfOrder: "Table Order",
          tableNo: data.tableNumber,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          noOfGuest: data.noOfGuests,
          specialNotes: data.notes || undefined,
          items: data.items.map((i) => ({
            itemId: i.id,
            quantity: i.qty,
          })),
        });

        const raw = res.data?.data ?? res.data;

        if (raw && (raw._id || raw.id)) {
          const mappedId = String(raw._id ?? raw.id);
          newOrder = {
            id: mappedId,
            tableNumber: Number(raw.tableNo ?? raw.tableNumber ?? data.tableNumber),
            customerName: data.customerName,
            items: data.items,
            totalPrice: data.totalPrice,
            notes: data.notes,
            status: "active",
            createdAt: String(raw.createdAt ?? new Date().toISOString()),
          };

          // Create payment record (don't await to avoid blocking)
          paymentApi.createPayment(mappedId, {
            paymentAmount: data.totalPrice,
            typeOfPayment: "Cash On Delivery"
          }).catch(paymentErr => {
            console.error("Payment API call failed for table order:", mappedId, paymentErr);
          });
        } else {
          throw new Error("Unexpected response from server");
        }
      } catch (error) {
        console.error("Table order creation failed:", error);
        // Create local fallback order
        newOrder = {
          id: `TBL${Date.now()}`,
          tableNumber: data.tableNumber,
          customerName: data.customerName,
          items: data.items,
          totalPrice: data.totalPrice,
          notes: data.notes,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setError("Order created locally but failed to sync with server");
      }

      setTableOrders((prev) => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) {
          return prev.map(o => o.id === newOrder.id ? newOrder : o);
        }
        return [newOrder, ...prev];
      });

      window.dispatchEvent(new CustomEvent("tableOrdersUpdated", { detail: { orderId: newOrder.id, action: "create" } }));
      return newOrder;
    },
    []
  );

  const updateTableOrderStatus = useCallback(
    async (orderId: string, status: TableOrder["status"]) => {
      setError(null);

      // Map frontend status to backend status
      const statusMap: Record<string, string> = {
        pending: "Pending",
        preparing: "Preparing",
        served: "Ready",
        completed: "Completed",
        cancelled: "Cancelled",
        active: "Active"
      };

      // Optimistic update
      const previousOrders = [...tableOrders];
      setTableOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );

      try {
        await orderApi.updateStatus(orderId, statusMap[status]);
        window.dispatchEvent(new CustomEvent("tableOrdersUpdated", { detail: { orderId, action: "statusUpdate", status } }));
      } catch (err) {
        console.error("Failed to update table order status on backend:", err);
        // Rollback on error
        setTableOrders(previousOrders);
        setError("Failed to update order status. Please try again.");
        throw err;
      }
    },
    [tableOrders]
  );

  const updateTableOrder = useCallback(
    async (orderId: string, data: Partial<Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">>) => {
      setError(null);

      // Optimistic update
      const previousOrders = [...tableOrders];
      setTableOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data } : o))
      );

      try {
        await orderApi.updateTableOrder(orderId, {
          ...(data.tableNumber !== undefined && { tableNo: data.tableNumber }),
          ...(data.items !== undefined && { items: data.items.map(i => ({ itemId: i.id, quantity: i.qty })) }),
          ...(data.notes !== undefined && { specialNotes: data.notes }),
        });
        window.dispatchEvent(new CustomEvent("tableOrdersUpdated", { detail: { orderId, action: "update" } }));
      } catch (err) {
        console.error("Failed to update table order on backend:", err);
        // Rollback on error
        setTableOrders(previousOrders);
        setError("Failed to update order. Please try again.");
        throw err;
      }
    },
    [tableOrders]
  );

  const deleteTableOrder = useCallback(async (orderId: string) => {
    setError(null);

    // Optimistic update
    const previousOrders = [...tableOrders];
    setTableOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    try {
      await orderApi.deleteTableOrder(orderId);
      window.dispatchEvent(new CustomEvent("tableOrdersUpdated", { detail: { orderId, action: "delete" } }));
    } catch (err) {
      console.error("Failed to delete table order on backend:", err);
      // Rollback on error
      setTableOrders(previousOrders);
      localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(previousOrders));
      setError("Failed to delete order. Please try again.");
      throw err;
    }
  }, [tableOrders]);

  const getActiveTableOrders = useCallback(
    () => tableOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled"),
    [tableOrders]
  );

  const getOrderById = useCallback(
    (orderId: string) => tableOrders.find((o) => o.id === orderId),
    [tableOrders]
  );

  const value = {
    tableOrders,
    isLoading,
    error,
    addTableOrder,
    updateTableOrderStatus,
    updateTableOrder,
    deleteTableOrder,
    getActiveTableOrders,
    getOrderById,
    refreshTableOrders,
    clearError,
  };

  return (
    <TableOrderContext.Provider value={value}>
      {children}
    </TableOrderContext.Provider>
  );
};

export const useTableOrders = () => {
  const ctx = useContext(TableOrderContext);
  if (!ctx) throw new Error("useTableOrders must be used within TableOrderProvider");
  return ctx;
};
