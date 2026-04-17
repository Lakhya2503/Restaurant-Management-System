import { useState, useEffect } from "react";
import { Users, Mail, Phone, Calendar, Shield, ShoppingCart, User as UserIcon } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isEmailVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await authApi.getAllUsers();
        // Backend returns { success: true, data: { users: [...] } }
        const userData = res.data?.data?.users || res.data?.users || res.data || [];
        setUsers(Array.isArray(userData) ? userData : []);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("Failed to load users list.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phoneNumber?.toString().includes(searchTerm)
  );

  // Helper function to get display role name
  const getDisplayRole = (role: string) => {
    if (role?.toLowerCase() === 'admin') return 'Admin';
    return 'Customer';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">User Management</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Overview of all registered customers and staff members.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Users className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left font-body text-xs font-bold uppercase tracking-wider text-muted-foreground p-4">Identity</th>
                <th className="text-left font-body text-xs font-bold uppercase tracking-wider text-muted-foreground p-4">Contact Details</th>
                <th className="text-left font-body text-xs font-bold uppercase tracking-wider text-muted-foreground p-4">Access Level</th>
                <th className="text-left font-body text-xs font-bold uppercase tracking-wider text-muted-foreground p-4">Registration</th>
                <th className="text-right font-body text-xs font-bold uppercase tracking-wider text-muted-foreground p-4">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-4">
                      <div className="h-12 bg-muted rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-primary/40" />
                    </div>
                    <p className="font-body text-muted-foreground font-medium">
                      {searchTerm ? "No users match your search." : "No registered users found."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-body font-bold text-sm text-foreground">{user.fullName || "Unnamed User"}</p>
                          <p className="font-body text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">ID: {user._id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {user.phoneNumber || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          user.role?.toLowerCase() === 'admin'
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {getDisplayRole(user.role)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-body text-[10px] font-bold border ${
                        user.isEmailVerified
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-extrabold text-foreground">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admins</p>
                <p className="text-2xl font-extrabold text-foreground">{users.filter(u => u.role?.toLowerCase() === 'admin').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customers</p>
                <p className="text-2xl font-extrabold text-foreground">{users.filter(u => u.role?.toLowerCase() !== 'admin').length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
