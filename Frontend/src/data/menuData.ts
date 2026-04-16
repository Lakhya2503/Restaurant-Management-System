import dish1 from "@/assets/dish-1.jpg";
import dish2 from "@/assets/dish-2.jpg";
import dish3 from "@/assets/dish-3.jpg";
import dish4 from "@/assets/dish-4.jpg";
import dish5 from "@/assets/dish-5.jpg";
import dish6 from "@/assets/dish-6.jpg";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  isAvailable: boolean;
  isVeg: boolean;
  ingredients?: string[];
}

export const categories = ["Starters", "Main Course", "Pizza & Pasta", "Desserts", "Salads", "Biryani"];

export const menuItems: MenuItem[] = [
];

// Gallery
export interface GalleryItem {
  image: string;
  title: string;
  category: string;
}
export const galleryCategories = ["Starters", "Main Course", "Pizza & Pasta", "Desserts", "Salads", "Biryani"];
export const galleryItems: GalleryItem[] = [
  { image: dish1, title: "Zesty Starters", category: "Starters" },
  { image: dish2, title: "Artisan Pasta", category: "Pizza & Pasta" },
  { image: dish3, title: "Our Signature Pizza", category: "Pizza & Pasta" },
  { image: dish4, title: "Fragrant Heritage", category: "Biryani" },
  { image: dish5, title: "Fresh & Green", category: "Salads" },
  { image: dish6, title: "Sweet Indulgence", category: "Desserts" },
  { image: dish1, title: "Chef's Greeting", category: "Starters" },
  { image: dish2, title: "Culinary Craft", category: "Main Course" },
];
// Legacy flat gallery
export const galleryImages = [dish1, dish2, dish3, dish4, dish5, dish6, dish1, dish2, dish3];

// Featured items used as offline fallback (no orders yet)
export const featuredMenuItems = menuItems.filter((item) => ["1", "6", "7", "4"].includes(item.id));
