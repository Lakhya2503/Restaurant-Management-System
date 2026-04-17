import { authApi } from "@/lib/api";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface Address {
  _id: string;
  addressLine: string;
  place: string;
  pinCode: string;
  label?: string;
  isDefault: boolean;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin";
  phone?: string;
  addresses?: Address[];
  isEmailVerified?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (payload: any) => Promise<void>;
  updateProfile: (data: {
    fullName?: string;
    phoneNumber?: string;
  }) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  addAddress: (payload: { addressLine: string; place: string; pinCode: string; label?: string }) => Promise<void>;
  updateAddress: (id: string, payload: { addressLine: string; place: string; pinCode: string; label?: string }) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setPrimaryAddress: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUser = (u: any): AppUser => {
  console.log("Mapping user data:", u);
  console.log("User addresses:", u.addresses);

  return {
    id: u._id || u.id,
    name: u.fullName || u.name || "User",
    email: u.email,
    avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.fullName || u.name || "user"}`,
    role: u.role || "user",
    phone: u.phoneNumber || u.phone,
    addresses: u.addresses?.map((addr: any) => ({
      _id: addr._id,
      addressLine: addr.addressLine,
      place: addr.place,
      pinCode: addr.pinCode?.toString() || "",
      label: addr.label || "Home",
      isDefault: addr.isDefault || false,
    })) || [],
    isEmailVerified: u.isEmailVerified || false,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      console.log("Fetch user response:", res);

      const raw = res.data?.data ?? res.data;
      if (raw) {
        const mappedUser = mapUser(raw);
        setUser(mappedUser);
        return mappedUser;
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      if (error instanceof Error && error.message.includes("401")) {
        setUser(null);
        sessionStorage.removeItem("accessToken");
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email, password });
      const raw = res.data?.data ?? res.data;

      if (raw?.accessToken) {
        sessionStorage.setItem("accessToken", raw.accessToken);
      }

      if (raw?.user) {
        setUser(mapUser(raw.user));
      } else if (raw?.email) {
        setUser(mapUser(raw));
      }

      toast.success("Login successful!");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      throw error;
    }
  }, []);

  const signup = useCallback(async (payload: any) => {
    try {
      const res = await authApi.register(payload);
      const raw = res.data?.data ?? res.data;
      if (raw?.user) {
        setUser(mapUser(raw.user));
        toast.success("Registration successful!");
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      sessionStorage.removeItem("accessToken");
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (data: {
    fullName?: string;
    phoneNumber?: string;
  }) => {
    try {
      console.log("Updating profile with data:", data);

      const res = await authApi.updateProfile({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber
      });

      console.log("Update profile response:", res);

      const raw = res.data?.data ?? res.data;
      console.log("Processed response data:", raw);

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
          toast.success("Profile updated successfully!");
        }
        else if (raw._id || raw.id) {
          setUser(mapUser(raw));
          toast.success("Profile updated successfully!");
        }
        else {
          await refreshUser();
          toast.success("Profile updated successfully!");
        }
      } else {
        await refreshUser();
        toast.success("Profile updated successfully!");
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error(error.message || "Failed to update profile");
      throw error;
    }
  }, [refreshUser]);

  const updateAvatar = useCallback(async (file: File) => {
    try {
      console.log("Uploading avatar:", file.name);

      if (!file.type.startsWith('image/')) {
        throw new Error("Please select an image file");
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image size must be less than 2MB");
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const res = await authApi.updateAvatar(formData);
      const raw = res.data?.data ?? res.data;

      console.log("Update avatar response:", res);

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
          toast.success("Avatar updated successfully!");
        }
        else if (raw._id || raw.id) {
          setUser(mapUser(raw));
          toast.success("Avatar updated successfully!");
        }
        else {
          await refreshUser();
          toast.success("Avatar updated successfully!");
        }
      } else {
        await refreshUser();
        toast.success("Avatar updated successfully!");
      }
    } catch (error: any) {
      console.error("Update avatar error:", error);
      toast.error(error.message || "Failed to update avatar");
      throw error;
    }
  }, [refreshUser]);

  const addAddress = useCallback(async (payload: { addressLine: string; place: string; pinCode: string; label?: string }) => {
    try {
      console.log("Adding address:", payload);
      const res = await authApi.addAddress(payload);
      const raw = res.data?.data ?? res.data;

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
        } else if (raw._id || raw.id) {
          setUser(mapUser(raw));
        } else {
          await refreshUser();
        }
      }

      toast.success("Address added successfully!");
    } catch (error: any) {
      console.error("Add address error:", error);
      toast.error(error.message || "Failed to add address");
      throw error;
    }
  }, [refreshUser]);

  const updateAddress = useCallback(async (id: string, payload: { addressLine: string; place: string; pinCode: string; label?: string }) => {
    try {
      const res = await authApi.updateAddress(id, payload);
      const raw = res.data?.data ?? res.data;

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
        } else if (raw._id || raw.id) {
          setUser(mapUser(raw));
        } else {
          await refreshUser();
        }
      }

      toast.success("Address updated successfully!");
    } catch (error: any) {
      console.error("Update address error:", error);
      toast.error(error.message || "Failed to update address");
      throw error;
    }
  }, [refreshUser]);

  const deleteAddress = useCallback(async (id: string) => {
    try {
      const res = await authApi.deleteAddress(id);
      const raw = res.data?.data ?? res.data;

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
        } else if (raw._id || raw.id) {
          setUser(mapUser(raw));
        } else {
          await refreshUser();
        }
      }

      toast.success("Address deleted successfully!");
    } catch (error: any) {
      console.error("Delete address error:", error);
      toast.error(error.message || "Failed to delete address");
      throw error;
    }
  }, [refreshUser]);

  const setPrimaryAddress = useCallback(async (id: string) => {
    try {
      const res = await authApi.setDefaultAddress(id);
      const raw = res.data?.data ?? res.data;

      if (raw) {
        if (raw.user) {
          setUser(mapUser(raw.user));
        } else if (raw._id || raw.id) {
          setUser(mapUser(raw));
        } else {
          await refreshUser();
        }
      }

      toast.success("Primary address updated!");
    } catch (error: any) {
      console.error("Set primary address error:", error);
      toast.error(error.message || "Failed to set primary address");
      throw error;
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
        signup,
        updateProfile,
        updateAvatar,
        addAddress,
        updateAddress,
        deleteAddress,
        setPrimaryAddress,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside provider");
  return ctx;
};
