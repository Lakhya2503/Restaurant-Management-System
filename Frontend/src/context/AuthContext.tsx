import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { authApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Address {
  id: string;
  label: string; // "Home" | "Work" | "Other"
  fullAddress: string;
  isPrimary: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin";
  phone?: string;
  addresses?: Address[];
}

/** Shape the backend register endpoint expects */
export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: number;
  adminSuperKey?: string;
  address?: {
    add: string;
    place: string;
    pinCode: number;
    currentAddSelected: boolean;
  }[];
}

interface AuthContextType {
  user: AppUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  // Real API actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (payload: RegisterPayload) => Promise<void>;
  // API Profile Updates
  updateProfile: (fullName: string, phoneNumber: string) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  // Local-only helpers
  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setPrimaryAddress: (id: string) => void;
  // Dev-only: kept so existing admin buttons still compile
  loginAsAdmin: () => void;
}

// ---------------------------------------------------------------------------
// Helpers — map backend user shape → frontend AppUser
// ---------------------------------------------------------------------------
function mapBackendUser(raw: Record<string, unknown>): AppUser {
  return {
    id: String(raw._id ?? raw.id ?? ""),
    name: String(raw.fullName ?? raw.name ?? ""),
    email: String(raw.email ?? ""),
    avatar:
      String(raw.avatar ?? "") ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        String(raw.fullName ?? "user")
      )}&backgroundColor=b6e3f4&radius=50`,
    role: (raw.role as "user" | "admin") ?? "user",
    phone: raw.phoneNumber ? String(raw.phoneNumber) : undefined,
    addresses: Array.isArray(raw.address)
      ? (raw.address as Record<string, unknown>[]).map((a, i) => ({
          id: String(a._id ?? i),
          label: String(a.place ?? "Home"),
          fullAddress: String(a.add ?? ""),
          isPrimary: Boolean(a.currentAddSelected),
        }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Fallback admin for dev-only button
// ---------------------------------------------------------------------------
const mockAdmin: AppUser = {
  id: "a1",
  name: "Admin Chef",
  email: "admin@athenura.in",
  avatar:
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=ffd5dc&radius=50",
  role: "admin",
  phone: "+91 99999 00000",
  addresses: [],
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------------------------
  // On mount — try to rehydrate from the httpOnly cookie via /auth/user/me
  // -------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.me();
        const raw = res.data?.data ?? res.data;
        if (raw) setUser(mapBackendUser(raw));
      } catch {
        // Not logged in — that's fine
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // -------------------------------------------------------------------------
  // Signup
  // -------------------------------------------------------------------------
  const signup = useCallback(async (payload: RegisterPayload) => {
    const res = await authApi.register(payload);
    const raw = res.data?.data ?? res.data;
    if (raw?.user) setUser(mapBackendUser(raw.user));
  }, []);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const raw = res.data?.data ?? res.data;
    // Some backends return token in response; store in sessionStorage
    if (raw?.accessToken) {
      sessionStorage.setItem("accessToken", raw.accessToken);
    }
    if (raw?.user) {
      setUser(mapBackendUser(raw.user));
    } else if (raw && raw.email) {
      // backend returned the user object directly
      setUser(mapBackendUser(raw));
    }
  }, []);

  // -------------------------------------------------------------------------
  // Dev-only admin login (no backend call)
  // -------------------------------------------------------------------------
  const loginAsAdmin = useCallback(() => {
    setUser(mockAdmin);
  }, []);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the endpoint fails, clear local state
    }
    sessionStorage.removeItem("accessToken");
    setUser(null);
  }, []);

  // -------------------------------------------------------------------------
  // Local-only address / profile helpers (no dedicated API endpoints yet)
  // -------------------------------------------------------------------------
  const updateProfile = useCallback(async (fullName: string, phoneNumber: string) => {
    const res = await authApi.updateProfile({ fullName, phoneNumber });
    const raw = res.data?.data ?? res.data;
    if (raw) setUser(mapBackendUser(raw));
  }, []);

  const updateAvatar = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await authApi.updateAvatar(formData);
    const raw = res.data?.data ?? res.data;
    if (raw) setUser(mapBackendUser(raw));
  }, []);

  const addAddress = useCallback((address: Omit<Address, "id">) => {
    setUser((prev) => {
      if (!prev) return null;
      const newAddr: Address = { ...address, id: `addr${Date.now()}` };
      const addresses = prev.addresses ?? [];
      const updated = newAddr.isPrimary
        ? addresses.map((a) => ({ ...a, isPrimary: false }))
        : [...addresses];
      return { ...prev, addresses: [...updated, newAddr] };
    });
  }, []);

  const updateAddress = useCallback(
    (id: string, updates: Partial<Address>) => {
      setUser((prev) => {
        if (!prev?.addresses) return prev;
        let addresses = prev.addresses.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        );
        if (updates.isPrimary) {
          addresses = addresses.map((a) => ({
            ...a,
            isPrimary: a.id === id,
          }));
        }
        return { ...prev, addresses };
      });
    },
    []
  );

  const deleteAddress = useCallback((id: string) => {
    setUser((prev) => {
      if (!prev?.addresses) return prev;
      const addresses = prev.addresses.filter((a) => a.id !== id);
      const hadPrimary = prev.addresses.find((a) => a.id === id)?.isPrimary;
      if (hadPrimary && addresses.length > 0) addresses[0].isPrimary = true;
      return { ...prev, addresses };
    });
  }, []);

  const setPrimaryAddress = useCallback((id: string) => {
    setUser((prev) => {
      if (!prev?.addresses) return prev;
      return {
        ...prev,
        addresses: prev.addresses.map((a) => ({
          ...a,
          isPrimary: a.id === id,
        })),
      };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
        loginAsAdmin,
        signup,
        updateProfile,
        updateAvatar,
        addAddress,
        updateAddress,
        deleteAddress,
        setPrimaryAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Re-export MockUser alias so any existing imports don't break
export type MockUser = AppUser;
