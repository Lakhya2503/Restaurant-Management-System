import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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

interface TableOrderContextType {
  tableOrders: TableOrder[];
  addTableOrder: (order: Omit<TableOrder, "id" | "createdAt">) => Promise<TableOrder>;
  updateTableOrderStatus: (orderId: string, status: TableOrder["status"]) => void;
  updateTableOrder: (
    orderId: string,
    data: Partial<Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">>
  ) => void;
  deleteTableOrder: (orderId: string) => void;
  getActiveTableOrders: () => TableOrder[];
}

const TableOrderContext = createContext<TableOrderContextType | undefined>(undefined);

export const TableOrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);

  // -------------------------------------------------------------------------
  // Fetch table orders from backend on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Load from localStorage first (for all users)
    const saved = localStorage.getItem("tableOrders");
    if (saved) {
      try {
        setTableOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local table orders", e);
      }
    }

    (async () => {
      try {
        const res = user?.role === "admin" 
          ? await orderApi.getAllOrders() 
          : await orderApi.getUserOrders();
          
        const raw: Record<string, unknown>[] =
          res.data?.data?.orders ?? res.data?.data ?? res.data ?? [];
        
        if (Array.isArray(raw)) {
          // Filter only table orders (case-insensitive)
          const tableRaw = raw.filter((o) => 
            String(o.orderType).toLowerCase() === "table order"
          );
          
          const mapped = tableRaw.map((r): TableOrder => {
            const rawItems = Array.isArray(r.items) ? (r.items as any[]) : [];
            const rawStatus = String(r.orderStatus ?? r.status ?? "pending").toLowerCase();
            
            // Calculate total price if totalAmount is missing or zero
            let calculatedTotal = Number(r.totalAmount ?? (r.paymentId as any)?.paymentAmount ?? 0);
            if (calculatedTotal === 0) {
              calculatedTotal = rawItems.reduce((acc, i) => {
                const itemNode = (typeof i.itemId === "object" && i.itemId !== null) ? (i.itemId as any) : {};
                const price = Number(itemNode.priceOfItem ?? i.price ?? 0);
                const q = Number(i.quantity ?? i.qty ?? 1);
                return acc + (price * q);
              }, 0);
            }

            return {
              id: String(r._id ?? r.id),
              tableNumber: Number(r.tableNo ?? 0),
              customerName: String(r.customerName ?? (r.userId as any)?.fullName ?? (r.userId as any)?.name ?? "Guest"),
              items: rawItems.map((i) => {
                const node = (typeof i.itemId === "object" && i.itemId !== null) ? (i.itemId as any) : i;
                return {
                  id: String(node._id ?? i.itemId ?? i.id ?? node.id),
                  name: String(node.itemName ?? node.name ?? ""),
                  price: Number(node.priceOfItem ?? node.price ?? 0),
                  qty: Number(i.quantity ?? i.qty ?? 1),
                  image: String(node.itemImage ?? node.image ?? ""),
                };
              }),
              totalPrice: calculatedTotal,
              notes: String(r.specialNotes ?? ""),
              status: (["active", "preparing", "served", "completed", "cancelled", "pending"].includes(rawStatus)
                ? rawStatus
                : "pending") as TableOrder["status"],
              createdAt: String(r.createdAt ?? new Date().toISOString()),
            };
          });
          setTableOrders(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch table orders from backend:", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (tableOrders.length > 0)
      localStorage.setItem("tableOrders", JSON.stringify(tableOrders));
  }, [tableOrders]);

  // -------------------------------------------------------------------------
  // addTableOrder — POST to backend, fall back to local on failure
  // -------------------------------------------------------------------------
  const addTableOrder = useCallback(
    async (data: Omit<TableOrder, "id" | "createdAt">): Promise<TableOrder> => {
      let newOrder: TableOrder;

      try {
        const res = await orderApi.createTableOrder({
          typeOfOrder: "Table Order",
          tableNo: String(data.tableNumber),
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

          try {
            await paymentApi.createPayment(mappedId, {
              paymentAmount: data.totalPrice,
              typeOfPayment: "Cash On Delivery"
            });
          } catch (paymentErr) {
            console.error("Payment API call failed for table order:", mappedId, paymentErr);
          }
        } else {
          throw new Error("Unexpected response");
        }
      } catch {
        // Offline / auth fallback
        newOrder = {
          ...data,
          id: `TBL${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
      }

      setTableOrders((prev) => {
        const unique = [newOrder, ...prev].filter((o, index, self) => 
          index === self.findIndex((t) => t.id === o.id)
        );
        return unique;
      });
      window.dispatchEvent(new Event("tableOrdersUpdated"));
      return newOrder;
    },
    []
  );

  const updateTableOrderStatus = useCallback(
    (orderId: string, status: TableOrder["status"]) => {
      setTableOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      window.dispatchEvent(new Event("tableOrdersUpdated"));
    },
    []
  );

  const updateTableOrder = useCallback(
    (
      orderId: string,
      data: Partial<
        Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">
      >
    ) => {
      setTableOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data } : o))
      );
      window.dispatchEvent(new Event("tableOrdersUpdated"));
    },
    []
  );

  const deleteTableOrder = useCallback((orderId: string) => {
    setTableOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      localStorage.setItem("tableOrders", JSON.stringify(updated));
      return updated;
    });
    window.dispatchEvent(new Event("tableOrdersUpdated"));
  }, []);

  const getActiveTableOrders = useCallback(
    () =>
      tableOrders.filter(
        (o) => o.status !== "completed" && o.status !== "cancelled"
      ),
    [tableOrders]
  );

  return (
    <TableOrderContext.Provider
      value={{
        tableOrders,
        addTableOrder,
        updateTableOrderStatus,
        updateTableOrder,
        deleteTableOrder,
        getActiveTableOrders,
      }}
    >
      {children}
    </TableOrderContext.Provider>
  );
};

export const useTableOrders = () => {
  const ctx = useContext(TableOrderContext);
  if (!ctx)
    throw new Error("useTableOrders must be used within TableOrderProvider");
  return ctx;
};
