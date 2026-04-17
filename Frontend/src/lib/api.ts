import axios from "axios";

// ---------------------------------------------------------------------------
// Base URL — in dev the Vite proxy rewrites /restaurant → http://localhost:5000
// In production set VITE_API_URL accordingly.
// ---------------------------------------------------------------------------
const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/restaurant/api/v1`;

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send/receive httpOnly cookies (JWT)
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token from memory if present
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — surface friendly error messages
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      sessionStorage.removeItem("accessToken");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong";

    return Promise.reject(new Error(message));
  }
);

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export const authApi = {
  register: (p: any) => api.post("/auth/user/register", p),
  login: (p: any) => api.post("/auth/user/login", p),
  logout: () => api.post("/auth/user/logout"),
  me: () => api.get("/auth/user/me"),

  getAllUsers:()=> api.get("/auth/user/all-users"),

  updateProfile: (data: { fullName?: string; phoneNumber?: string }) =>
    api.patch("/auth/user/update-profile", data, {
      headers: { "Content-Type": "application/json" },
    }),

  updateAvatar: (fd: FormData) =>
    api.post("/auth/user/update-avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Fixed address methods
   addAddress: (payload: { addressLine: string; place: string; pinCode: string; label?: string }) =>
    api.post("/auth/user/add-new/address", payload),

  updateAddress: (id: string, payload: any) =>
    api.put(`/auth/user/address/${id}`, payload),

  setDefaultAddress: (id: string) =>
    api.patch(`/auth/user/address/${id}/default`),

  deleteAddress: (id: string) =>
    api.delete(`/auth/user/address/${id}`),
};

// ---------------------------------------------------------------------------
// Menu helpers
// ---------------------------------------------------------------------------
export const menuApi = {
  fetchAll: () => api.get("/menu/fetch-full/menu"),

  createItem: (payload: any) => {
    const isFormData = payload instanceof FormData;
    return api.post("/menu/create/new-item", payload, {
      headers: {
        "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      },
    });
  },

  updateItem: (itemId: string, payload: any) => {
    const isFormData = payload instanceof FormData;
    return api.post(`/menu/update-item/${itemId}`, payload, {
      headers: {
        "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      },
    });
  },

  deleteItem: (itemId: string) => api.delete(`/menu/delete-item/${itemId}`),
};

// ---------------------------------------------------------------------------
// Order helpers
// ---------------------------------------------------------------------------
export const orderApi = {
  /** Home delivery order */
  createHomeDelivery: (payload: {
    items: { itemId: string; quantity: number }[];
    address: string;
  }) => api.post("/order/add/home-delivery-order", payload),

  /** Table / dine-in order */
  createTableOrder: (payload: {
    tableNo: string;
    specialNotes?: string;
    items: { itemId: string; quantity: number }[];
  }) => api.post("/order/add/table-order", payload),

  getUserOrders: () => api.get("/order/order-users"),

  cancelOrder: (orderId: string, payload?: { cancellationReason?: string }) =>
    api.post(`/order/cancelled-order/${orderId}`, payload),

  // Admin
  getAllOrders: () => api.get("/order/all-orders"),
  updateStatus: (orderId: string, status: string, cancellationReason?: string) => {
    // Capitalize first letter of status to match backend OrderStatusEnums
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    return api.post(`/order/update/status-order/${orderId}`, {
      status: formattedStatus,
      ...(cancellationReason && { cancellationReason })
    });
  },
};

// ---------------------------------------------------------------------------
// Payment helpers
// ---------------------------------------------------------------------------
export const paymentApi = {
  createPayment: (orderId: string, payload: {
    paymentAmount: number;
    typeOfPayment: "Cash On Delivery" | "Online";
  }) => api.post(`/payment/new-payment/${orderId}`, payload),
};

// ---------------------------------------------------------------------------
// Reservation helpers
// ---------------------------------------------------------------------------
export const reservationApi = {
  create: (payload: {
    tableNo: number;
    startTime: string;
    endTime: string;
    date: string;
    noOfGuests: number;
    name?: string;
    phoneNumber?: string;
    SpecialRequests?: string;
    reservationUserEmail?: string;
  }) => api.post("/reserve/new-reserve", payload),

 getAvailableTables: (payload: {
    noOfGuests: number;
    date: string;
    startTime: string;
    endTime: string;
  }) => api.post("/reserve/available-table", payload),



  updateStatus: (reservationId: string, payload: {
    tableNo?: number;
    tableReservationStatus: string;
  }) => api.post(`/reserve/update-reservation/${reservationId}`, payload),

  getUserReservations: () => api.get("/reserve/get-user-reservations"),

  getAllReservations: () => api.get("/reserve/get-all-reservations"),

  getSummary: () => api.get("/reserve/get-summary"),
};
