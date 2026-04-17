import { StartersGallary } from "../assets/images.js";
import {
    PastaPizzaGallary,
    BiryaniGallary,
    DessertGallary,
    MainCourseGallary,
    SaladsGallary
} from '../assets/images';

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
  { image: PastaPizzaGallary, title: "Artisan Pasta", category: "Pizza & Pasta" },
  { image: BiryaniGallary, title: "Fragrant Heritage", category: "Biryani" },
  { image: SaladsGallary, title: "Fresh & Green", category: "Salads" },
  { image: DessertGallary, title: "Sweet Indulgence", category: "Desserts" },
  { image: StartersGallary, title: "Chef's Greeting", category: "Starters" },
  { image: MainCourseGallary, title: "Culinary Craft", category: "Main Course" },
];
// Legacy flat gallery
export const galleryImages = [StartersGallary, PastaPizzaGallary, BiryaniGallary, SaladsGallary, DessertGallary, StartersGallary, StartersGallary, MainCourseGallary];

// Featured items used as offline fallback (no orders yet)
export const featuredMenuItems = menuItems.filter((item) => ["1", "6", "7", "4"].includes(item.id));
