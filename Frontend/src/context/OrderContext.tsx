import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { orderApi, paymentApi, reservationApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  addOrder: (
    orderData: Omit<Order, "id" | "createdAt">
  ) => Promise<{ order: Order; payment: any }>;
  addReservation: (
    reservation: Omit<Reservation, "id" | "createdAt" | "assignedTable">,
    tableId?: number
  ) => Promise<Reservation>;
  updateOrderStatus: (
    orderId: string,
    status: Order["status"],
    cancellationReason?: string
  ) => void;
  updateReservationStatus: (
    reservationId: string,
    status: Reservation["status"]
  ) => void;
  assignTableToReservation: (
    reservationId: string,
    tableNumber: number
  ) => void;
  getTableRangeForGuests: (guests: number) => TableRange;
  getAvailableTables: (
    date: string,
    startTime: string,
    endTime: string,
    guests: number
  ) => Promise<number[]>;
  getUserReservations: (userId: string) => Reservation[];
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  getReservationSummary: () => Promise<Record<string, number>>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Time helpers (unchanged from original)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helper: map a raw backend order to our frontend Order shape
// ---------------------------------------------------------------------------
function mapBackendOrder(raw: Record<string, unknown>): Order {
  const rawItems = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];

  // Safely handle populated userId
  const userObj = (typeof raw.userId === "object" && raw.userId !== null)
    ? (raw.userId as Record<string, unknown>)
    : {};

  const actualUserId = String(raw.userId?._id ?? raw.userId ?? raw.user ?? "");
  const actualUserName = String(userObj.fullName ?? userObj.name ?? "");
  const actualUserPhone = String(userObj.phoneNumber ?? userObj.phone ?? "");

  // Status mapping
  const rawStatus = String(raw.orderStatus ?? raw.status ?? "pending").toLowerCase();

  // Payment mapping
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
    totalPrice: (function() {
      const val = Number(paymentObj?.paymentAmount ?? raw.totalAmount ?? raw.totalPrice ?? raw.total ?? 0);
      if (val > 0) return val;
      // Re-calculate if zero
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

  // Format dates to HH:mm for frontend if they are full ISO strings
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("orders") ?? "[]");
    } catch {
      return [];
    }
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("reservations") ?? "[]");
    } catch {
      return [];
    }
  });

  // Persist reservations to localStorage (no backend endpoint yet)
  useEffect(() => {
    if (reservations.length > 0) {
      localStorage.setItem("reservations", JSON.stringify(reservations));
    }
  }, [reservations]);

  // ---------------------------------------------------------------------------
  // Fetch user orders AND reservations from backend when logged in
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isLoggedIn) return;

    (async () => {
      try {
        // Orders
        const ordRes = user?.role === "admin"
          ? await orderApi.getAllOrders()
          : await orderApi.getUserOrders();

        const rawO: Record<string, unknown>[] =
          ordRes.data?.data?.orders ?? ordRes.data?.data ?? ordRes.data ?? [];
        if (Array.isArray(rawO)) {
          setOrders(rawO.map(mapBackendOrder));
        }

        // Reservations
        const resRes = user?.role === "admin"
          ? await reservationApi.getAllReservations()
          : await reservationApi.getUserReservations();

        const rawR: Record<string, unknown>[] =
          resRes.data?.data ?? resRes.data ?? [];

          console.log("rawR",rawR)
          
        if (Array.isArray(rawR)) {
          setReservations(rawR.map(mapBackendReservation));
        }
      } catch (err) {
        console.error("Failed to fetch data from backend", err);
      }
    })();
  }, [isLoggedIn, user?.id, user?.role]);

  // ---------------------------------------------------------------------------
  // addOrder — POST to backend then update local state
  // ---------------------------------------------------------------------------
  const addOrder = useCallback(
    async (orderData: Omit<Order, "id" | "createdAt">): Promise<{ order: Order; payment: any }> => {
      // Determine order type from context (delivery if address present)
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
          // Shouldn't reach here via addOrder for table — see addTableOrder
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
        // Offline fallback — store locally
        newOrder = {
          ...orderData,
          id: `ORD${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
      }

      setOrders((prev) => [newOrder, ...prev]);
      return { order: newOrder, payment: paymentData };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // cancelOrder
  // ---------------------------------------------------------------------------
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
    window.dispatchEvent(new Event("ordersUpdated"));
  }, []);

  // ---------------------------------------------------------------------------
  // Reservation helpers (local only — no backend endpoint wired yet)
  // ---------------------------------------------------------------------------
  const getTableRangeForGuests = useCallback((guests: number): TableRange => {
    const safeGuests =
      Number.isFinite(guests) && guests > 0 ? Math.floor(guests) : 1;
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
        const raw = res.data?.data ?? res.data;
        return raw.freeTables || [];
      } catch (err) {
        console.error("Failed to fetch available tables from backend", err);
        // Fallback to local calculation if backend fails
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
      const normalizedStart =
        reservationData.startTime || reservationData.time;
      const normalizedEnd =
        reservationData.endTime || addMinutesToTime(normalizedStart, 60);

      if (
        timeToMinutes(normalizedStart) >= timeToMinutes(normalizedEnd)
      ) {
        throw new Error("End time must be later than start time.");
      }

      const availableTables = await getAvailableTables(
        reservationData.date,
        normalizedStart,
        normalizedEnd,
        reservationData.guests
      );

      if (availableTables.length === 0) {
        throw new Error(
          "No tables available for the selected date/time slot."
        );
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
        window.dispatchEvent(new Event("reservationsUpdated"));
        return newRes;
      } catch (error) {
        // Fallback or rethrow
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
        window.dispatchEvent(new Event("reservationsUpdated"));
        return newReservation;
      }
    },
    [getAvailableTables]
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: Order["status"],
      cancellationReason?: string
    ) => {
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
      window.dispatchEvent(new Event("ordersUpdated"));
    },
    []
  );

  const updateReservationStatus = useCallback(
    async (reservationId: string, status: Reservation["status"]) => {
      // Map frontend status to backend status
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
      window.dispatchEvent(new Event("reservationsUpdated"));
    },
    []
  );

  const assignTableToReservation = useCallback(
    async (reservationId: string, tableNumber: number) => {
      try {
        await reservationApi.updateStatus(reservationId, {
          tableNo: tableNumber,
          tableReservationStatus: "Confirm" // Usually assigning a table confirms it
        });
      } catch (err) {
        console.error("Failed to assign table on backend", err);
      }

      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, assignedTable: tableNumber, status: "confirmed" } : r
        )
      );
      window.dispatchEvent(new Event("reservationsUpdated"));
    },
    []
  );

  const getUserOrders = useCallback(
    (userId: string) => orders.filter((o) => o.userId === userId),
    [orders]
  );

  const getUserReservations = useCallback(
    (userId: string) =>
      reservations.filter((r) => r.userId === userId),
    [reservations]
  );

  const getReservationSummary = useCallback(async () => {
    try {
      const res = await reservationApi.getSummary();
      return res.data?.data ?? {};
    } catch (err) {
      console.error("Failed to fetch reservation summary", err);
      // Fallback: calculate locally
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
