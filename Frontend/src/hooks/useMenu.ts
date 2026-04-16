import { useQuery } from "@tanstack/react-query";
import { menuApi } from "@/lib/api";
import { menuItems as staticMenu, type MenuItem } from "@/data/menuData";

/** Shape the backend returns for a single menu item */
interface RawMenuItem {
  _id?: string;
  id?: string;
  itemName?: string;
  name?: string;
  itemDescription?: string;
  description?: string;
  itemImage?: string;
  image?: string;
  priceOfItem?: number;
  price?: number;
  itemCategory?: string;
  category?: string;
  isAvailable?: boolean;
  isVeg?: boolean;
}

function mapItem(raw: RawMenuItem): MenuItem {
  return {
    id: String(raw._id ?? raw.id ?? Math.random()),
    name: String(raw.itemName ?? raw.name ?? ""),
    description: String(raw.itemDescription ?? raw.description ?? ""),
    category: String(raw.itemCategory ?? raw.category ?? ""),
    price: Number(raw.priceOfItem ?? raw.price ?? 0),
    image: String(raw.itemImage ?? raw.image ?? ""),
    isAvailable: raw.isAvailable !== false, // default true
    isVeg: Boolean(raw.isVeg),
  };
}

export function useMenu() {
  const { data, isLoading, isError, error } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: async () => {
      const res = await menuApi.fetchAll();
      const raw: RawMenuItem[] = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(raw) || raw.length === 0) return staticMenu;
      return raw.map(mapItem);
    },
    staleTime: 1000 * 60 * 5, // 5 min
    // Fall back to static data on network error
    placeholderData: staticMenu,
    retry: 1,
  });

  return {
    menuItems: data ?? staticMenu,
    isLoading,
    isError,
    error,
  };
}
