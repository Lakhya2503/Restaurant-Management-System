import { useState } from "react";
import { categories, type MenuItem } from "@/data/menuData";
import { useMenu } from "@/hooks/useMenu";
import { menuApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminMenu = () => {
  const { menuItems: items, isLoading } = useMenu();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "Starters", price: "", image: "", isVeg: true });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => {
    setForm({ name: "", description: "", category: "Starters", price: "", image: "", isVeg: true });
    setImagePreview("");
    setImageFile(null);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setForm({ 
      name: item.name, 
      description: item.description, 
      category: item.category, 
      price: String(item.price), 
      image: item.image,
      isVeg: (item as any).isVeg !== false // Default to true if undefined
    });
    setImagePreview(item.image);
    setEditing(item);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      // Create preview
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const save = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append("itemName", form.name);
      formData.append("itemDescription", form.description);
      formData.append("itemCategory", form.category);
      formData.append("priceOfItem", form.price);
      formData.append("isVeg", String(form.isVeg));
      if (imageFile) {
        formData.append("itemImage", imageFile);
      } else if (editing) {
        formData.append("itemImage", form.image);
      }

      if (editing) {
        await menuApi.updateItem(editing.id, formData);
        toast.success("Item updated");
      } else {
        await menuApi.createItem(formData);
        toast.success("Item added");
      }
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      setShowForm(false);
      setImagePreview("");
      setImageFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await menuApi.deleteItem(id);
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Item deleted");
    } catch (err: any) {
      toast.error("Failed to delete item");
    }
  };

  const toggleAvailability = async (id: string) => {
    // Requires backend support for toggling availability (or calling updateItem with flipped value)
    toast.info("Availability toggle requires backend logic updates");
  };

  const update = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Menu Management</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground font-body font-semibold gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{editing ? "Edit Item" : "New Item"}</h2>
            <button onClick={() => { setShowForm(false); setImagePreview(""); }}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="font-body text-sm font-medium text-foreground">Dish Image</label>
            <div className="flex flex-col md:flex-row gap-4">
              {imagePreview ? (
                <div className="relative w-full md:w-48 h-48 rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImagePreview(""); setImageFile(null); setForm((p) => ({ ...p, image: "" })); }}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full md:w-48 h-48 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <span className="font-body text-sm text-muted-foreground mb-1">Click to upload</span>
                  <span className="font-body text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1 space-y-2">
                <p className="font-body text-xs text-green-600 font-semibold mb-1">
                  Ready to upload file.
                </p>
                <p className="font-body text-[10px] text-muted-foreground">
                  The image will be securely uploaded to the server and processed by Cloudinary.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Item Name *" className="px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="Price (₹) *" type="number" className="px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={form.isVeg === true} 
                onChange={() => setForm(p => ({ ...p, isVeg: true }))}
                className="w-4 h-4 accent-green-600"
              />
              <span className="font-body text-sm text-green-600 font-semibold">Veg</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={form.isVeg === false} 
                onChange={() => setForm(p => ({ ...p, isVeg: false }))}
                className="w-4 h-4 accent-red-600"
              />
              <span className="font-body text-sm text-red-600 font-semibold">Non-Veg</span>
            </label>
          </div>
          <select value={form.category} onChange={(e) => update("category", e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" rows={2} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          <Button onClick={save} disabled={isSaving} className="bg-primary text-primary-foreground font-body font-semibold">
            {isSaving ? "Saving..." : (editing ? "Save Changes" : "Add Item")}
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Image", "Name", "Category", "Price", "Available", "Actions"].map((h) => (
                  <th key={h} className="text-left font-body text-xs font-semibold text-muted-foreground p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground font-body">Loading menu items...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground font-body">No items in menu. Start adding some!</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="p-3"><img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover" /></td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-body text-sm font-medium">{item.name}</span>
                      <span className={`text-[10px] font-bold uppercase ${(item as any).isVeg !== false ? 'text-green-600' : 'text-red-600'}`}>
                        {(item as any).isVeg !== false ? '● Veg' : '● Non-Veg'}
                      </span>
                    </div>
                  </td>
                  <td className="font-body text-xs p-3 text-muted-foreground">{item.category}</td>
                  <td className="font-body text-sm p-3 font-semibold text-primary">₹{item.price}</td>
                  <td className="p-3">
                    <button onClick={() => toggleAvailability(item.id)} className={`font-body text-xs px-2.5 py-1 rounded-full ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                      {item.isAvailable ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMenu;
