import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { Camera, Edit2, LogOut, Phone, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, isLoggedIn, logout, updateProfile, updateAvatar } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // sync user data
  useEffect(() => {
    if (user) {
      setNewName(user.name || "");
      setNewPhone(user.phone || "");
    }
  }, [user]);

  if (!isLoggedIn || !user) {
    navigate("/login");
    return null;
  }

  // ✅ Update profile (name + phone)
  const handleUpdateProfile = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        fullName: newName,
        phoneNumber: newPhone,
      });

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Update avatar (separate API)
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      await updateAvatar(file);
    } catch (error: any) {
      // Error toast already shown in updateAvatar function
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="pt-24 pb-20 min-h-screen bg-background">
      <div className="container max-w-2xl">

        {/* PROFILE CARD */}
        <div className="bg-card border rounded-2xl p-6 flex items-center gap-6 mb-8">

          {/* AVATAR */}
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full"
              disabled={isLoading}
            >
              <Camera size={16} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>

          {/* USER INFO */}
          <div className="flex-1">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && (
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            )}

            <div className="flex gap-3 mt-4">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Edit2 size={14} /> Edit
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* NAME */}
                    <div>
                      <label className="text-xs">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-2 top-2.5 w-4 h-4" />
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full pl-8 py-2 border rounded"
                        />
                      </div>
                    </div>

                    {/* PHONE */}
                    <div>
                      <label className="text-xs">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-2.5 w-4 h-4" />
                        <input
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="w-full pl-8 py-2 border rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={handleUpdateProfile} disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut size={14} /> Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
