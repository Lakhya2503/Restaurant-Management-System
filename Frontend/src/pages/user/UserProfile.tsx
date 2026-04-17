  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { Award, Camera, Check, Edit, Home, Loader2, Mail, MapPin, Phone, Plus, Star, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

  const UserProfile = () => {
    const { user, updateProfile, updateAvatar, addAddress, deleteAddress, setPrimaryAddress, refreshUser } = useAuth();

    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [addAddressOpen, setAddAddressOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
    const [addressForm, setAddressForm] = useState({
      label: "Home",
      addressLine: "",
      place: "",
      pinCode: ""
    });
    const [loading, setLoading] = useState({ profile: false, address: false });

    const fileInputRef = useRef<HTMLInputElement>(null);

    console.log("user", user);
    console.log("user.addresses", user?.addresses);
    console.log("primaryAddress", user?.addresses?.find((a) => a.isDefault));

    useEffect(() => {
      if (user) {
        setProfileForm({
          name: user.name || "",
          phone: user.phone || ""
        });
      }
    }, [user]);

    const getFullAddress = (address: any) => {
      return `${address.addressLine}, ${address.place} - ${address.pinCode}`;
    };

    const handleRefresh = async () => {
      setIsRefreshing(true);
      await refreshUser();
      setIsRefreshing(false);
      toast.success("Profile refreshed");
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);
      try {
        await updateAvatar(file);
      } catch (error: any) {
        console.error(error);
        // Error toast already shown in updateAvatar function
      } finally {
        setIsUploadingAvatar(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!profileForm.name.trim()) {
        toast.error("Name is required");
        return;
      }

      if (profileForm.phone && !/^[6-9]\d{9}$/.test(profileForm.phone)) {
        toast.error("Enter valid 10-digit phone number");
        return;
      }

      setLoading({ ...loading, profile: true });
      try {
        console.log(profileForm)
        await updateProfile({
          fullName: profileForm.name,
          phoneNumber: profileForm.phone
        });
        setEditProfileOpen(false);
      } catch (error: any) {
        console.error(error);
      } finally {
        setLoading({ ...loading, profile: false });
      }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!addressForm.addressLine.trim()) {
        toast.error("Please enter address line");
        return;
      }
      if (!addressForm.place.trim()) {
        toast.error("Please enter city/place");
        return;
      }
      if (!addressForm.pinCode.trim()) {
        toast.error("Please enter PIN code");
        return;
      }
      if (!/^\d{6}$/.test(addressForm.pinCode)) {
        toast.error("Please enter a valid 6-digit PIN code");
        return;
      }

      setLoading({ ...loading, address: true });
      try {
        await addAddress(addressForm);
        setAddAddressOpen(false);
        setAddressForm({
          label: "Home",
          addressLine: "",
          place: "",
          pinCode: ""
        });
      } catch (error: any) {
        console.error(error);
      } finally {
        setLoading({ ...loading, address: false });
      }
    };

    const handleDeleteAddress = async (id: string) => {
      try {
        await deleteAddress(id);
        setDeleteDialogOpen(null);
      } catch (error: any) {
        console.error(error);
      }
    };

    const handleSetPrimaryAddress = async (id: string) => {
      try {
        await setPrimaryAddress(id);
      } catch (error: any) {
        console.error(error);
      }
    };

    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    const primaryAddress = user.addresses?.find((a) => a.isDefault);
    const otherAddresses = user.addresses?.filter((a) => !a.isDefault) || [];

    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <Loader2 className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Profile Information Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-row justify-between items-center bg-card border-b border-border">
            <CardTitle className="font-display text-2xl text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Profile Information
            </CardTitle>
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" /> Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">Edit Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateProfile} className="space-y-5 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      placeholder="Enter your full name"
                      required
                      disabled={loading.profile}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      placeholder="10-digit mobile number"
                      disabled={loading.profile}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter 10-digit mobile number
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading.profile}>
                    {loading.profile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-6 pb-4 border-b border-border">
              <div className="relative group">
                <img
                  src={user.avatar}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  alt={user.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
                  }}
                />

                {/* Camera overlay button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Change avatar"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />

                
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground">{user.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.role === 'admin' && <Award className="w-3 h-3 inline mr-1" />}
                    {user.role?.toUpperCase()}
                  </span>
                  {user.isEmailVerified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="w-3 h-3 inline mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-foreground font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-foreground font-medium">{user.phone || "Not provided"}</p>
                </div>
              </div>

              {primaryAddress && (
                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      Primary Address
                    </p>
                    <p className="text-foreground font-medium">{getFullAddress(primaryAddress)}</p>
                    {primaryAddress.label && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {primaryAddress.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saved Addresses Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-row justify-between items-center bg-card border-b border-border">
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Saved Addresses
              <span className="text-sm text-muted-foreground font-normal">
                ({user.addresses?.length || 0})
              </span>
            </CardTitle>
            <Dialog open={addAddressOpen} onOpenChange={setAddAddressOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Address
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">Add New Address</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAddress} className="space-y-5 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address Label
                    </label>
                    <div className="flex gap-2">
                      {["Home", "Work", "Other"].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setAddressForm({ ...addressForm, label })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            addressForm.label === label
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address Line <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={addressForm.addressLine}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      placeholder="Street address, house number, area"
                      required
                      disabled={loading.address}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City/Place <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={addressForm.place}
                      onChange={(e) => setAddressForm({ ...addressForm, place: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      placeholder="City, town, or village"
                      required
                      disabled={loading.address}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      PIN Code <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={addressForm.pinCode}
                      onChange={(e) => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      placeholder="6-digit PIN code"
                      maxLength={6}
                      pattern="\d{6}"
                      required
                      disabled={loading.address}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a valid 6-digit PIN code
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading.address}>
                    {loading.address ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Address"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="pt-6">
            {!user.addresses || user.addresses.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No addresses saved yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Add your first address for faster checkout
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary Address */}
                {primaryAddress && (
                  <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="text-sm font-semibold text-primary">
                            Primary Address
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-foreground">{primaryAddress.addressLine}</p>
                            <p className="text-sm text-muted-foreground">
                              {primaryAddress.place} - {primaryAddress.pinCode}
                            </p>
                          </div>
                        </div>
                        {primaryAddress.label && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {primaryAddress.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Addresses */}
                {otherAddresses.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Other Addresses
                    </h4>
                    {otherAddresses.map((address) => (
                      <div
                        key={address._id}
                        className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {address.label && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  {address.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <p className="text-foreground">{address.addressLine}</p>
                                <p className="text-sm text-muted-foreground">
                                  {address.place} - {address.pinCode}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              onClick={() => handleSetPrimaryAddress(address._id)}
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-primary/80 hover:bg-primary/10"
                              title="Set as primary"
                            >
                              <Star className="w-4 h-4" />
                            </Button>

                            <AlertDialog
                              open={deleteDialogOpen === address._id}
                              onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                  onClick={() => setDeleteDialogOpen(address._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Address</AlertDialogTitle>
                                  <p className="text-muted-foreground mt-2">
                                    Are you sure you want to delete this address? This action cannot be undone.
                                  </p>
                                </AlertDialogHeader>
                                <div className="flex gap-3 mt-4">
                                  <AlertDialogCancel className="flex-1">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="flex-1 bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDeleteAddress(address._id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  export default UserProfile;
