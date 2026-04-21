import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { orderApi, paymentApi, reservationApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// Types
export interface Order {
  id: string;
  userId: string;
  orderType?: string;
  tableNo?: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    qty: number;
    image: string;
  }>;
  totalPrice: number;
  contact: {
    name: string;
    phone: string;
    address: string;
  };
  payment: string;
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled" | "active";
  cancellationReason?: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone: string;
  guests: number;
  date: string;
  startTime?: string;
  endTime?: string;
  time: string;
  notes: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  assignedTable?: number;
  createdAt: string;
}

interface TableRange {
  start: number;
  end: number;
}

interface OrderContextType {
  orders: Order[];
  reservations: Reservation[];
  addOrder: (orderData: Omit<Order, "id" | "createdAt">) => Promise<{ order: Order; payment: any }>;
  addReservation: (reservation: Omit<Reservation, "id" | "createdAt" | "assignedTable">, tableId?: number) => Promise<Reservation>;
  updateOrderStatus: (orderId: string, status: Order["status"], cancellationReason?: string) => void;
  updateReservationStatus: (reservationId: string, status: Reservation["status"]) => void;
  assignTableToReservation: (reservationId: string, tableNumber: number) => void;
  getTableRangeForGuests: (guests: number) => TableRange;
  getAvailableTables: (date: string, startTime: string, endTime: string, guests: number) => Promise<number[]>;
  getUserReservations: (userId: string) => Reservation[];
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  getReservationSummary: () => Promise<Record<string, number>>;
  refreshData: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Helper functions
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const safe = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const addMinutesToTime = (time: string, minutesToAdd: number) =>
  minutesToTime(timeToMinutes(time) + minutesToAdd);

const intervalsOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
};

// Mapping functions
function mapBackendOrder(raw: Record<string, unknown>): Order {
  const rawItems = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];
  const userObj = (typeof raw.userId === "object" && raw.userId !== null)
    ? (raw.userId as Record<string, unknown>)
    : {};

  const actualUserId = String(raw.userId?._id ?? raw.userId ?? raw.user ?? "");
  const actualUserName = String(userObj.fullName ?? userObj.name ?? "");
  const actualUserPhone = String(userObj.phoneNumber ?? userObj.phone ?? "");
  const rawStatus = String(raw.orderStatus ?? raw.status ?? "pending").toLowerCase();
  const paymentObj = (typeof raw.paymentId === "object" && raw.paymentId !== null)
    ? (raw.paymentId as Record<string, unknown>)
    : null;

  return {
    id: String(raw._id ?? raw.id ?? ""),
    userId: actualUserId,
    orderType: raw.orderType ? String(raw.orderType) : undefined,
    tableNo: raw.tableNo ? Number(raw.tableNo) : undefined,
    items: rawItems.map((item) => {
      const itemNode = (typeof item.itemId === "object" && item.itemId !== null)
        ? (item.itemId as Record<string, unknown>)
        : {};
      return {
        id: String(itemNode._id ?? item.itemId ?? item.id ?? ""),
        name: String(itemNode.itemName ?? itemNode.name ?? item.name ?? "Unavailable Item"),
        price: Number(itemNode.priceOfItem ?? itemNode.price ?? item.price ?? 0),
        qty: Number(item.quantity ?? item.qty ?? 1),
        image: String(itemNode.itemImage ?? itemNode.image ?? item.image ?? ""),
      };
    }),
    totalPrice: (() => {
      const val = Number(paymentObj?.paymentAmount ?? raw.totalAmount ?? raw.totalPrice ?? raw.total ?? 0);
      if (val > 0) return val;
      return rawItems.reduce((acc, i) => {
        const itemNode = (typeof i.itemId === "object" && i.itemId !== null) ? (i.itemId as any) : {};
        const p = Number(itemNode.priceOfItem ?? itemNode.price ?? i.price ?? 0);
        const q = Number(i.quantity ?? i.qty ?? 1);
        return acc + (p * q);
      }, 0);
    })(),
    contact: {
      name: String((raw.customerName ?? (raw.contact as any)?.name ?? actualUserName) || "Guest"),
      phone: String((raw.phoneNumber ?? (raw.contact as any)?.phone ?? actualUserPhone) || ""),
      address: String(raw.address ?? (raw.contact as any)?.address ?? ""),
    },
    payment: String(paymentObj?.typeOfPayment ?? raw.payment ?? raw.paymentMethod ?? "COD"),
    status: (["pending", "preparing", "ready", "delivered", "cancelled", "active"].includes(rawStatus)
      ? rawStatus
      : "pending") as Order["status"],
    cancellationReason: raw.cancellationReason ? String(raw.cancellationReason) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function mapBackendReservation(raw: Record<string, unknown>): Reservation {
  const start = String(raw.startTime || "");
  const end = String(raw.endTime || "");

  const formatTime = (timeStr: string) => {
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    }
    return timeStr;
  };

  return {
    id: String(raw._id ?? raw.id ?? ""),
    userId: String(raw.reservationUserId?._id ?? raw.reservationUserId ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.reservationUserEmail ?? ""),
    phone: String(raw.phoneNumber ?? ""),
    guests: Number(raw.noOfGuests ?? 0),
    date: String(raw.date).split("T")[0],
    startTime: formatTime(start),
    endTime: formatTime(end),
    time: formatTime(start),
    notes: String(raw.SpecialRequests ?? ""),
    status: (String(raw.tableReservationStatus ?? "pending").toLowerCase() as any),
    assignedTable: Number(raw.tableNo ?? 0),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

// Helper function to dispatch refresh events
const dispatchRefreshEvents = () => {
  window.dispatchEvent(new Event("ordersUpdated"));
  window.dispatchEvent(new Event("reservationsUpdated"));
  window.dispatchEvent(new Event("dataRefreshed"));
  window.dispatchEvent(new Event("storage"));
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch user orders and reservations from backend when logged in
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;

    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const [ordRes, resRes] = await Promise.all([
        user?.role === "admin" ? orderApi.getAllOrders() : orderApi.getUserOrders(),
        user?.role === "admin" ? reservationApi.getAllReservations() : reservationApi.getUserReservations()
      ]);

      const rawO: Record<string, unknown>[] = ordRes.data?.data?.orders ?? ordRes.data?.data ?? ordRes.data ?? [];
      if (Array.isArray(rawO)) {
        setOrders(rawO.map(mapBackendOrder));
      }

      const rawR: Record<string, unknown>[] = resRes.data?.data ?? resRes ?? [];

      if (Array.isArray(rawR)) {
        setReservations(rawR.map(mapBackendReservation));
      }
    } catch (err) {
      console.error("Failed to fetch data from backend", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoggedIn, user?.role, isRefreshing]);

  // Refresh data function exposed to components
  const refreshData = useCallback(async () => {
    await fetchData();
    if (refreshUser) await refreshUser();
    dispatchRefreshEvents();
  }, [fetchData, refreshUser]);

  // Initial fetch and refresh on user change
  useEffect(() => {
    fetchData();
  }, [fetchData, isLoggedIn, user?.id, user?.role]);

  // Set up auto-refresh interval (optional - refreshes every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchData]);

  const addOrder = useCallback(
    async (orderData: Omit<Order, "id" | "createdAt">): Promise<{ order: Order; payment: any }> => {
      const isDelivery = Boolean(orderData.contact?.address);
      let newOrder: Order;
      let paymentData: any = null;

      try {
        let res;
        if (isDelivery) {
          res = await orderApi.createHomeDelivery({
            typeOfOrder: "Home Delivery",
            items: orderData.items.map((i) => ({
              itemId: i.id,
              quantity: i.qty,
            })),
            address: orderData.contact.address,
          });
        } else {
          res = await orderApi.createHomeDelivery({
            typeOfOrder: "Home Delivery",
            items: orderData.items.map((i) => ({
              itemId: i.id,
              quantity: i.qty,
            })),
            address: orderData.contact.address,
          });
        }

        const raw = res.data?.data ?? res.data;
        const mappedOrder = raw ? mapBackendOrder(raw as Record<string, unknown>) : null;

        if (mappedOrder && mappedOrder.id) {
          const isOnline = !orderData.payment.toLowerCase().includes("cod");
          const paymentMethod = isOnline ? "Online" : "Cash On Delivery";

          try {
            const payRes = await paymentApi.createPayment(mappedOrder.id, {
              paymentAmount: orderData.totalPrice,
              typeOfPayment: paymentMethod
            });
            paymentData = payRes.data?.data?.paymentId || payRes.data?.data || null;
          } catch (paymentErr) {
            console.error("Payment API call failed for order ID:", mappedOrder.id, paymentErr);
          }

          newOrder = mappedOrder;
        } else {
          newOrder = {
            ...orderData,
            id: `ORD${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
        }
      } catch {
        newOrder = {
          ...orderData,
          id: `ORD${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
      }

      setOrders((prev) => [newOrder, ...prev]);

      // Refresh data from backend
      await fetchData();
      dispatchRefreshEvents();

      return { order: newOrder, payment: paymentData };
    },
    [fetchData]
  );

  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    try {
      await orderApi.cancelOrder(orderId, reason ? { cancellationReason: reason } : undefined);
    } catch {
      // Continue updating local state regardless
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "cancelled", ...(reason && { cancellationReason: reason }) } : o
      )
    );

    // Refresh data from backend
    await fetchData();
    dispatchRefreshEvents();
  }, [fetchData]);

  const getTableRangeForGuests = useCallback((guests: number): TableRange => {
    const safeGuests = Number.isFinite(guests) && guests > 0 ? Math.floor(guests) : 1;
    if (safeGuests === 1) return { start: 1, end: 5 };
    const start = 6 + (safeGuests - 2) * 15;
    return { start, end: start + 14 };
  }, []);

  const getAvailableTables = useCallback(
    async (date: string, startTime: string, endTime: string, guests: number) => {
      try {
        const res = await reservationApi.getAvailableTables({
          noOfGuests: guests,
          date,
          startTime,
          endTime
        });
        const raw = res?.data?.data ?? res.data;
        console.log(raw)
        return raw.freeTables || [];
      } catch (err) {
        console.error("Failed to fetch available tables from backend", err);
        const range = getTableRangeForGuests(guests);
        const reservedTableSet = new Set(
          reservations
            .filter(
              (r) =>
                r.date === date &&
                r.status !== "cancelled" &&
                intervalsOverlap(
                  r.startTime || r.time,
                  r.endTime || addMinutesToTime(r.startTime || r.time, 60),
                  startTime,
                  endTime
                ) &&
                r.assignedTable !== undefined
            )
            .map((r) => r.assignedTable as number)
        );
        const available: number[] = [];
        for (let table = range.start; table <= range.end; table++) {
          if (!reservedTableSet.has(table)) available.push(table);
        }
        return available;
      }
    },
    [getTableRangeForGuests, reservations]
  );

  const addReservation = useCallback(
    async (
      reservationData: Omit<Reservation, "id" | "createdAt" | "assignedTable">,
      tableId?: number
    ): Promise<Reservation> => {
      const normalizedStart = reservationData.startTime || reservationData.time;
      const normalizedEnd = reservationData.endTime || addMinutesToTime(normalizedStart, 60);

      if (timeToMinutes(normalizedStart) >= timeToMinutes(normalizedEnd)) {
        throw new Error("End time must be later than start time.");
      }

      const availableTables = await getAvailableTables(
        reservationData.date,
        normalizedStart,
        normalizedEnd,
        reservationData.guests
      );

      if (availableTables.length === 0) {
        throw new Error("No tables available for the selected date/time slot.");
      }

      const assignedTable = tableId || availableTables[0];

      try {
        const res = await reservationApi.create({
          tableNo: assignedTable,
          startTime: normalizedStart,
          endTime: normalizedEnd,
          date: reservationData.date,
          noOfGuests: reservationData.guests,
          name: reservationData.name,
          phoneNumber: reservationData.phone,
          SpecialRequests: reservationData.notes,
          reservationUserEmail: reservationData.email
        });

        const raw = res.data?.data ?? res.data;
        const newRes = mapBackendReservation(raw as Record<string, unknown>);
        setReservations((prev) => [newRes, ...prev]);

        // Refresh data from backend
        await fetchData();
        dispatchRefreshEvents();

        return newRes;
      } catch (error) {
        console.error("Backend reservation failed, falling back to local", error);
        const newReservation: Reservation = {
          ...reservationData,
          time: normalizedStart,
          startTime: normalizedStart,
          endTime: normalizedEnd,
          id: `RES${Date.now()}`,
          createdAt: new Date().toISOString(),
          assignedTable,
          status: "pending"
        };
        setReservations((prev) => [newReservation, ...prev]);

        // Refresh data from backend
        await fetchData();
        dispatchRefreshEvents();

        return newReservation;
      }
    },
    [getAvailableTables, fetchData]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order["status"], cancellationReason?: string) => {
      try {
        await orderApi.updateStatus(orderId, status, cancellationReason);
      } catch (err) {
        console.error("Failed to update status on backend:", err);
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status, ...(cancellationReason && { cancellationReason }) }
            : o
        )
      );

      // Refresh data from backend
      await fetchData();
      dispatchRefreshEvents();
    },
    [fetchData]
  );

  const updateReservationStatus = useCallback(
    async (reservationId: string, status: Reservation["status"]) => {
      const statusMap: Record<string, string> = {
        pending: "Pending",
        confirmed: "Confirm",
        completed: "Completed",
        cancelled: "Cancelled"
      };

      try {
        await reservationApi.updateStatus(reservationId, {
          tableReservationStatus: statusMap[status] || status
        });
      } catch (err) {
        console.error("Failed to update reservation status on backend", err);
      }

      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, status } : r))
      );

      // Refresh data from backend
      await fetchData();
      dispatchRefreshEvents();
    },
    [fetchData]
  );

  const assignTableToReservation = useCallback(
    async (reservationId: string, tableNumber: number) => {
      try {
        await reservationApi.updateStatus(reservationId, {
          tableNo: tableNumber,
          tableReservationStatus: "Confirm"
        });
      } catch (err) {
        console.error("Failed to assign table on backend", err);
      }
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, assignedTable: tableNumber, status: "confirmed" } : r
        )
      );

      // Refresh data from backend
      await fetchData();
      dispatchRefreshEvents();
    },
    [fetchData]
  );

  const getUserOrders = useCallback(
    (userId: string) => orders.filter((o) => o.userId === userId),
    [orders]
  );

  const getUserReservations = useCallback(
    (userId: string) => reservations.filter((r) => r.userId === userId),
    [reservations]
  );

  const getReservationSummary = useCallback(async () => {
    try {
      const res = await reservationApi.getSummary();
      return res.data?.data ?? {};
    } catch (err) {
      console.error("Failed to fetch reservation summary", err);
      const summary: Record<string, number> = {
        Pending: 0,
        Confirm: 0,
        Completed: 0,
        Cancelled: 0
      };
      reservations.forEach(r => {
        const s = r.status.charAt(0).toUpperCase() + r.status.slice(1);
        const key = s === "Confirmed" ? "Confirm" : s;
        if (summary[key] !== undefined) summary[key]++;
      });
      return summary;
    }
  }, [reservations]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        reservations,
        addOrder,
        addReservation,
        updateOrderStatus,
        updateReservationStatus,
        assignTableToReservation,
        getTableRangeForGuests,
        getAvailableTables,
        getUserOrders,
        getUserReservations,
        cancelOrder,
        getReservationSummary,
        refreshData,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used within OrderProvider");
  return context;
};


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
  addTableOrder: (order: Omit<TableOrder, "id" | "createdAt"> & {
    date: string;
    startTime: string;
    endTime: string;
    noOfGuests: number;
  }) => Promise<TableOrder>;
  updateTableOrderStatus: (orderId: string, status: TableOrder["status"]) => void;
  updateTableOrder: (orderId: string, data: Partial<Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">>) => void;
  deleteTableOrder: (orderId: string) => void;
  getActiveTableOrders: () => TableOrder[];
}

const TableOrderContext = createContext<TableOrderContextType | undefined>(undefined);

const TABLE_ORDERS_STORAGE_KEY = "tableOrders";

export const TableOrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);

  // Fetch table orders from backend on mount
  useEffect(() => {
    const saved = localStorage.getItem(TABLE_ORDERS_STORAGE_KEY);
    if (saved) {
      try {
        setTableOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local table orders", e);
      }
    }

    const fetchTableOrders = async () => {
      try {
        const res = user?.role === "admin"
          ? await orderApi.getAllOrders()
          : await orderApi.getUserOrders();

        const raw: Record<string, unknown>[] = res.data?.data?.orders ?? res.data?.data ?? res.data ?? [];

        if (Array.isArray(raw)) {
          const tableRaw = raw.filter((o) =>
            String(o.orderType).toLowerCase() === "table order"
          );

          const mapped = tableRaw.map((r): TableOrder => {
            const rawItems = Array.isArray(r.items) ? (r.items as any[]) : [];
            const rawStatus = String(r.orderStatus ?? r.status ?? "pending").toLowerCase();

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
    };

    fetchTableOrders();
  }, [user]);

  // Persist to localStorage with debounce
  useEffect(() => {
    if (tableOrders.length > 0) {
      const saveTimeout = setTimeout(() => {
        localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(tableOrders));
      }, 100);
      return () => clearTimeout(saveTimeout);
    }
  }, [tableOrders]);

  const addTableOrder = useCallback(
    async (data: Omit<TableOrder, "id" | "createdAt"> & {
      date: string;
      startTime: string;
      endTime: string;
      noOfGuests: number;
    }): Promise<TableOrder> => {
      let newOrder: TableOrder;

      try {
        const res = await orderApi.createTableOrder({
          typeOfOrder: "Table Order",
          tableNo: String(data.tableNumber),
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
    (orderId: string, data: Partial<Pick<TableOrder, "tableNumber" | "items" | "totalPrice" | "notes">>) => {
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
      localStorage.setItem(TABLE_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    window.dispatchEvent(new Event("tableOrdersUpdated"));
  }, []);

  const getActiveTableOrders = useCallback(
    () => tableOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled"),
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
  if (!ctx) throw new Error("useTableOrders must be used within TableOrderProvider");
  return ctx;
};


import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Reservation from "../models/reservation.models.js";
import {
  buildConflictQuery,
  validateTimeFormat,
  toMinutes,
  getTableRange,
  getPossibleTables,
  requiredField} from "../utils/helper.js";
import Table from "../models/table.models.js";
import { tableReservationStatus } from "../utils/constants.js";

// ===================== CREATE RESERVATION =====================
const newTableReservation = asyncHandler(async (req, res) => {
  const {
    tableNo,
    startTime,
    endTime,
    date,
    noOfGuests,
    name,
    phoneNumber,
    specialRequests = "",
    reservationUserEmail,
  } = req.body;

  console.log("Request Body:", req.body);

  // Validate required fields
  if (!tableNo || !startTime || !endTime || !date || !noOfGuests || !name || !phoneNumber) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Validate time format
  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    throw new ApiError(400, "Invalid time format. Expected HH:mm");
  }

  // Convert times to minutes
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  console.log("Start Time (minutes):", startMin);
  console.log("End Time (minutes):", endMin);

  // Validate time logic
  if (startMin >= endMin) {
    throw new ApiError(400, "End time must be after start time");
  }

  // Validate date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  console.log("Parsed Date:", parsedDate);

  // Check if table is already booked for this time slot
  const existingBooking = await Table.findOne({
    tableNumber: tableNo,
    date: parsedDate,
    tableStatus: { $ne: tableReservationStatus.CANCELLED },
    $or: [
      {
        startTimeInMinutes: { $lt: endMin },
        endTimeInMinutes: { $gt: startMin },
      },
    ],
  });

  if (existingBooking) {
    throw new ApiError(409, "Table is already booked for this time slot");
  }

  // Create table reservation
  const tableReservation = {
    tableNumber: tableNo,
    startTime: startTime,
    startTimeInMinutes: startMin,
    numberOfGuest: noOfGuests,
    endTime: endTime,
    endTimeInMinutes: endMin,
    date: parsedDate,
    tableStatus: tableReservationStatus.PENDING,
  };

  console.log("Table Reservation Data:", tableReservation);

  const tableCreated = await Table.create(tableReservation);

  if (!tableCreated) {
    throw new ApiError(500, "Failed to create table reservation");
  }

  console.log("Table Created:", tableCreated);

  // Create main reservation record
  const reservationData = {
    userId: req.user._id,
    userEmail: reservationUserEmail || req.user.email,
    phoneNumber: phoneNumber,
    specialRequests: specialRequests,
    name: name,
    tableId: tableCreated._id,
  };

  console.log("Reservation Data:", reservationData);

  const reservation = await Reservation.create(reservationData);

  if (!reservation) {
    // Rollback table creation if reservation fails
    await Table.findByIdAndDelete(tableCreated._id);
    throw new ApiError(500, "Failed to create reservation");
  }

  console.log("Reservation Created:", reservation);

  return res
    .status(201)
    .json(new ApiResponse(201, reservation, "Reservation created successfully"));
});

// ===================== AVAILABLE TABLES =====================
const availableTableForReservation = asyncHandler(async (req, res) => {
    const { noOfGuests, date, startTime, endTime } = req.body;

    console.log("req.body", req.body)

    const parsedDate = new Date(date);
    console.log("parsedDate", parsedDate)

    const range = getTableRange(Number(noOfGuests));
    console.log("range", range)
    if (!range) throw new ApiError(400, "Invalid guest count");

    const possibleTables = getPossibleTables(range);
    console.log("possibleTables", possibleTables)

    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    console.log("startOfDay", startOfDay)

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);
    console.log("endOfDay", endOfDay)

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    console.log("startMin", startMin)
    console.log("endMin", endMin)

    if (startMin > endMin) {
        console.log("startTime", startTime)
        console.log("endMin", endMin)
        throw new ApiError(400, "Invalid time range");
    }

    // Corrected overlap query - find ALL tables that are booked during the requested time
    const bookedTables = await Table.find({
        tableNumber: { $in: possibleTables },
        date: { $gte: startOfDay, $lte: endOfDay },
        tableStatus: { $ne: "cancelled" },
        $or: [
              {
                  date : { $in : parsedDate }
              },
            {
                startTimeInMinutes: { $gte: startMin, $lt: endMin }
            },
            {
                endTimeInMinutes: { $gt: startMin, $lte: endMin }
            },
            {
                startTimeInMinutes: { $lte: startMin },
                endTimeInMinutes: { $gte: endMin }
            }
        ]
    });

    console.log("bookedTables", bookedTables)

    const bookedSet = new Set(bookedTables.map((b) => b.tableNumber));
    console.log("bookedSet", bookedSet)

    const freeTables = possibleTables.filter((t) => !bookedSet.has(t));
    console.log("freeTables", freeTables)

    return res.status(200).json(
        new ApiResponse(200, { freeTables }, "Available tables fetched")
    );
});

// ===================== UPDATE STATUS =====================
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { reservationId } = req.params; // Changed from tableReservationId
  const { status, tableStatus } = req.body; // status for Reservation, tableStatus for Table

  if (!status && !tableStatus) {
    throw new ApiError(400, "At least one status is required");
  }

  // Find the reservation first
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  let updatedReservation = null;
  let updatedTable = null;

  // Update Reservation status if provided
  if (status) {
    // Note: Your Reservation schema doesn't have a status field
    // You might need to add it. For now, I'll assume you want to update tableStatus
    // through the associated Table document
    updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { $set: req.body }, // Update any fields that exist in the schema
      { new: true, runValidators: true }
    ).populate("userId", "fullName email phoneNumber avatar");
  }

  // Update Table status if provided
  if (tableStatus && reservation.tableId) {
    updatedTable = await Table.findByIdAndUpdate(
      reservation.tableId,
      { tableStatus: tableStatus },
      { new: true, runValidators: true }
    );
  }

  // Fetch the final reservation with populated data
  const finalReservation = await Reservation.findById(reservationId)
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId");

  return res.status(200).json(
    new ApiResponse(200, {
      reservation: finalReservation,
      table: updatedTable
    }, "Updated successfully")
  );
});

// ===================== USER RESERVATIONS =====================
const getUserReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({
    userId: req.user?._id,
  })
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId")
    .sort({ createdAt: -1 }); // Using createdAt since Reservation doesn't have date/startTimeInMinutes

  console.log("reservations", reservations);

  // Transform data to include table details
  const formattedReservations = reservations.map(reservation => ({
    ...reservation.toObject(),
    tableDetails: reservation.tableId,
    reservationDate: reservation.tableId?.date,
    startTime: reservation.tableId?.startTime,
    endTime: reservation.tableId?.endTime,
    numberOfGuests: reservation.tableId?.numberOfGuest,
    status: reservation.tableId?.tableStatus
  }));

  console.log("formattedReservations",reservations)

  return res.status(200).json(
    new ApiResponse(200, reservations, "User reservations fetched successfully")
  );
});

// ===================== ALL RESERVATIONS =====================
const getAllReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find()
    .populate("userId", "fullName email phoneNumber")
    .populate("tableId")
    .sort({ createdAt: -1 });

  // Transform data to include table details
  const formattedReservations = reservations.map(reservation => ({
    ...reservation.toObject(),
    tableDetails: reservation.tableId,
    reservationDate: reservation.tableId?.date,
    startTime: reservation.tableId?.startTime,
    endTime: reservation.tableId?.endTime,
    numberOfGuests: reservation.tableId?.numberOfGuest,
    status: reservation.tableId?.tableStatus
  }));

  return res.status(200).json(
    new ApiResponse(200, reservations, "All reservations fetched successfully")
  );
});

// ===================== SUMMARY =====================
const getReservationSummary = asyncHandler(async (req, res) => {
  // Get summary from Table collection since status is stored there
  const result = await Table.aggregate([
    {
      $group: {
        _id: "$tableStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  result.forEach((r) => {
    const statusKey = r._id?.toLowerCase();
    if (summary.hasOwnProperty(statusKey)) {
      summary[statusKey] = r.count;
    }
  });

  // Also get reservation count
  const totalReservations = await Reservation.countDocuments();

  return res.status(200).json(
    new ApiResponse(200, {
      tableStatusSummary: summary,
      totalReservations: totalReservations
    }, "Summary fetched successfully")
  );
});

// ===================== GET RESERVATION BY ID =====================
const getReservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reservation = await Reservation.findById(id)
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId");

  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  return res.status(200).json(
    new ApiResponse(200, reservation, "Reservation fetched successfully")
  );
});

// ===================== CANCEL RESERVATION =====================
const cancelReservation = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  // Update table status to cancelled
  const updatedTable = await Table.findByIdAndUpdate(
    reservation.tableId,
    { tableStatus: tableReservationStatus.CANCELLED },
    { new: true }
  );

  if (!updatedTable) {
    throw new ApiError(404, "Table reservation not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      reservation: reservation,
      table: updatedTable
    }, "Reservation cancelled successfully")
  );
});

export {
  newTableReservation,
  availableTableForReservation,
  updateReservationStatus,
  getUserReservations,
  getAllReservations,
  getReservationSummary,
  getReservationById,
  cancelReservation,
};


import Order from "../models/order.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { OrderStatusEnums, orderType } from "../utils/constants.js";
import { requiredField, toMinutes } from '../utils/helper.js';
import mongoose  from "mongoose";
import Menu from '../models/menu.models.js';
import Table from "../models/table.models.js";

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Items must be a non-empty array");
  }

  for (const item of items) {
    if (!item.itemId || item.quantity == null) {
      throw new ApiError(400, "Each item must have itemId and quantity");
    }

    if (item.quantity <= 0) {
      throw new ApiError(400, "Quantity must be greater than 0");
    }

    if (!mongoose.Types.ObjectId.isValid(item.itemId)) {
      throw new ApiError(400, `Invalid itemId: ${item.itemId}`);
    }
  }
};

const checkItemsExist = async (items) => {
  const itemIds = items.map(i => i.itemId);

  const menuItems = await Menu.find({ _id: { $in: itemIds } });

  if (menuItems.length !== itemIds.length) {
    throw new ApiError(400, "Some items do not exist");
  }

  return menuItems;
};

const createHomeDeliveryOrder = asyncHandler(async (req, res) => {
  const { address, items } = req.body;

  if (!address) {
    throw new ApiError(400, "Address is required");
  }

  validateItems(items);
  const menuItems = await checkItemsExist(items);

  const totalAmount = items.reduce((total, item) => {
    const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
    return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
  }, 0);

  const order = await Order.create({
    orderType: orderType.HOMEDELIVERY,
    userId: req.user._id,
    address,
    items,
    activeOrder: false,
    totalAmount
  });

  return res.status(201).json(
    new ApiResponse(201, order, "Home delivery order created successfully")
  );
});

const createTableOrder = asyncHandler(async (req, res) => {
  console.log("req.body = ", req.body);

  const {
    noOfGuest,
    typeOfOrder,
    tableNo,
    items,
    date,
    startTime,
    endTime,
    specialNotes
  } = req.body;

  // Validate required fields
  if (!tableNo) {
    throw new ApiError(400, "Table number is required");
  }

  if (!items || items.length === 0) {
    throw new ApiError(400, "At least one item is required");
  }

  // Convert times
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const parsedDate = new Date(date);

  // Create table reservation
  const tableReservation = {
    orderType: typeOfOrder,
    tableNumber: Number(tableNo),
    startTime: startTime,
    startTimeInMinutes: startMin,
    numberOfGuest: noOfGuest || 1,
    endTime: endTime,
    endTimeInMinutes: endMin,
    date: parsedDate
  };

  console.log("Table reservation data:", tableReservation);
  const tableCreated = await Table.create(tableReservation);
  console.log("Table created:", tableCreated._id);

  // Check menu items
  const menuItems = await checkItemsExist(items);

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => {
    const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
    return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
  }, 0);

  // Prepare order data - TRY DIFFERENT VARIATIONS:

  // Variation 1: Check if your Order schema expects 'tableId' or 'table'
  const tableOrderCreation = {
    items: items,
    orderType: typeOfOrder,
    userId: req.user._id,
    tableId: tableCreated._id,  // Try 'table: tableCreated._id' if this fails
    // table: tableCreated._id,  // Alternative field name
    orderStatus: "Pending",
    activeOrder: true,
    specialNotes: specialNotes || "",
    totalAmount: totalAmount,
  };

  console.log("Order data being sent:", JSON.stringify(tableOrderCreation, null, 2));

  // Try-catch specifically for Order creation
  let tableOrderCreated;
  try {
    tableOrderCreated = await Order.create(tableOrderCreation);
    console.log("Order created successfully:", tableOrderCreated._id);
  } catch (error) {
    console.error("Order creation failed!");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error details:", error.errors); // Mongoose validation errors
    console.error("Full error:", error);

    // Delete the table since order creation failed
    await Table.findByIdAndDelete(tableCreated._id);
    console.log("Rolled back - deleted table:", tableCreated._id);

    throw new ApiError(400, `Order creation failed: ${error.message}`);
  }

  return res.status(201).json(
    new ApiResponse(201, tableOrderCreated, "Table order created successfully")
  );
});

// admin
const orderStatusUpdate = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body;
  const { orderId } = req.params;

  requiredField([status]);

  if (!OrderStatusEnums.includes(status)) {
    throw new ApiError(400, "Please provide a valid status");
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      orderStatus: status,
      ...(cancellationReason && { cancellationReason })
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res.status(200).json(
    new ApiResponse(200, order, "Order updated successfully")
  );
});

const tableOrderUpdate = asyncHandler(async(req,res) => {

    const { orderId } = req.params

    const { items, specialNotes, tableNo } = req.body

    const order = await Order.findById(orderId)

    if(!order) {
      throw new ApiError(400, "Order can't find")
    }
      requiredField(items);

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    items.forEach((item) => {
      if (!item.itemId || !item.quantity) {
        throw new ApiError(400, "Each item must have itemId and quantity");
      }

      if (item.quantity <= 0) {
        throw new ApiError(400, "Quantity must be greater than 0");
      }

    })

    const updateData = {}


    if(order.userId === req.user?._id) {
      throw new ApiError(401, "You can't update the Table order")
    }




    if(order.orderType !== orderType.TABLEORDER ) {
      throw new ApiResponse(400, "This is not Table order")
    }

    if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }
    updateData.items = items;
  }

  if (tableNo) {
    if (tableNo <= 0) {
      throw new ApiError(400, "Invalid table number");
    }
    updateData.tableNo = tableNo;
  }

  if (specialNotes !== undefined) {
    updateData.specialNotes = specialNotes;
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    order?._id,
    { $set: updateData },
    { new: true }
  );


    return res.status(200).json(new ApiResponse(200,  { updatedOrder }  , "table order update"))
})

const deleteTableOrder = asyncHandler(async(req,res)=>{

    const { orderId } = req.params

    const order = await Order.findById(orderId)

     if(order.orderType !== orderType.TABLEORDER ) {
      throw new ApiResponse(400, "This is not Table order")
    }

    if(order.userId !== req.user?._id) {
      throw new ApiError(401, "You can't Delete the Table order")
    }

    await Order.findByIdAndDelete(order?._id)

  return res.status(200).json(new ApiResponse(200, {}, "Table order delete successfully"))
});

const cancelledHomeDeliveryOrder = asyncHandler(async(req,res)=>{
  const { orderId } = req.params;
  const { cancellationReason } = req.body;

   await Order.findByIdAndUpdate(orderId, {
    $set : {
        orderStatus : 'Cancelled',
        ...(cancellationReason && { cancellationReason })
    }
   },  { new: true })

    return res.status(200).json(new ApiResponse(200, {}, "Home delivery order cancelled successfully"))
})

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("userId", "name email fullName")
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("paymentId")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "All orders fetched successfully"));
});

// user
const userOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ userId })
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("tableId" , "table.tableNumber")
    .populate("userId" , "fullName")
    .populate("paymentId")



  return res.status(200).json(
    new ApiResponse(200, orders , "User orders fetched successfully")
  );
});


export {
  createHomeDeliveryOrder,
  createTableOrder,
  orderStatusUpdate,
  tableOrderUpdate,
  deleteTableOrder,
  allOrders,
  userOrders,
  cancelledHomeDeliveryOrder
}



