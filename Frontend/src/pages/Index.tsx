import { Link } from "react-router-dom";
import {
  ArrowRight,
  Star,
  MapPin,
  Utensils,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import heroImg from "@/assets/hero-restaurant.jpg";
import MenuCard from "@/components/MenuCard";
import { useEffect, useState } from "react";
import { menuApi } from "../lib/api";

const Index = () => {
  const [menuData, setMenuData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await menuApi.fetchAll();
        setMenuData(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // ✅ Map API → UI format + filter + limit to 5
  const allAvailable = menuData
    .filter((item) => item.isAvailable)
    .slice(0, 5) // 🔥 only 5 dishes
    .map((item) => ({
      id: item._id,
      name: item.itemName,
      image: item.itemImage,
      price: item.priceOfItem,
      category: item.itemCategory,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
    }));

  if (loading) return null;

  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-secondary">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Signature dish"
            className="w-full h-full object-cover animate-scale-in opacity-30"
            style={{ animationDuration: "1.5s" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-secondary via-secondary/80 to-secondary" />
        </div>

        <div className="absolute inset-0 hero-pattern opacity-40 pointer-events-none" />

        <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-primary/15 rounded-full blur-[100px] animate-float pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-80 h-80 bg-primary/10 rounded-full blur-[80px] animate-float-delayed pointer-events-none" />
        <div className="absolute top-[40%] right-[30%] w-40 h-40 bg-primary/8 rounded-full blur-[60px] animate-pulse-soft pointer-events-none" />

        <div className="absolute top-[15%] right-[12%] w-24 h-24 border border-primary/20 rounded-full animate-float-slow pointer-events-none" />
        <div className="absolute bottom-[25%] left-[8%] w-16 h-16 border border-primary/15 rounded-full animate-float pointer-events-none" />
        <div className="absolute top-[60%] right-[8%] w-3 h-3 bg-primary/50 rounded-full animate-pulse-soft pointer-events-none" />
        <div className="absolute top-[25%] left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-float-delayed pointer-events-none" />

        <div className="container relative z-10 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-2xl">
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-secondary-foreground leading-[0.95] mb-8 animate-fade-in-up">
                Savor the
                <br />
                <span className="gradient-text">Extraordinary</span>
              </h1>

              <p className="font-body text-secondary-foreground/60 text-lg md:text-xl leading-relaxed mb-10 max-w-lg animate-fade-in-up stagger-1">
                A culinary journey where tradition meets innovation — every dish is a masterpiece crafted with passion and the finest seasonal ingredients.
              </p>

              <div className="flex flex-wrap gap-4 mb-12 animate-fade-in-up stagger-2">
                <Link
                  to="/menu"
                  className="group inline-flex items-center gap-3 bg-primary text-primary-foreground font-body font-semibold px-8 py-4 rounded-2xl hover:bg-primary/90 transition-all hover-lift animate-shimmer-btn shadow-xl shadow-primary/25 text-lg"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Order Online
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/profile/table-order"
                  className="group inline-flex items-center gap-3 bg-secondary-foreground/10 backdrop-blur-sm border-2 border-primary/40 text-secondary-foreground font-body font-semibold px-8 py-4 rounded-2xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover-scale text-lg"
                >
                  <UtensilsCrossed className="w-5 h-5" />
                  Dine-In Order
                </Link>

                <Link
                  to="/reservation"
                  className="inline-flex items-center gap-2 border-2 border-secondary-foreground/20 text-secondary-foreground font-body font-semibold px-8 py-4 rounded-2xl hover:bg-secondary-foreground/5 hover:border-secondary-foreground/30 transition-all hover-scale backdrop-blur-sm text-lg"
                >
                  Reserve a Table
                </Link>
              </div>

              <div className="flex flex-wrap gap-8 animate-fade-in-up stagger-3">
                {[
                  { icon: Utensils, value: "150+", label: "Dishes" },
                  { icon: Star, value: "4.9", label: "Rating" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-secondary-foreground leading-none">
                        {stat.value}
                      </p>
                      <p className="font-body text-xs text-secondary-foreground/50">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-center items-center relative animate-fade-in-up stagger-2">
              <div className="relative w-[400px] h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-black/30 hover-lift transition-all duration-500">
                <img src={heroImg} alt="Signature dish" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="inline-block bg-primary text-primary-foreground font-body text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    Chef's Special
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white mb-1">
                    Today's Signature
                  </h3>
                  <p className="font-body text-white/70 text-sm">
                    Handcrafted with seasonal ingredients
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Dishes */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="flex items-end justify-between mb-10 animate-fade-in-up">
            <div>
              <p className="font-body text-primary font-semibold text-sm tracking-widest uppercase mb-2">
                Our Menu
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Our Speciallity
              </h2>
            </div>

            <Link
              to="/menu"
              className="hidden md:inline-flex items-center gap-1 font-body text-sm font-semibold text-primary hover:underline transition-all hover-scale"
            >
              Browse & Filter <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allAvailable.map((item, i) => (
              <div
                key={item.id}
                className={`animate-fade-in-up stagger-${Math.min(
                  (i % 4) + 1,
                  4
                )}`}
              >
                <MenuCard item={item} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden animate-fade-in">
            <Link
              to="/menu"
              className="inline-flex items-center gap-1 font-body text-sm font-semibold text-primary hover-scale"
            >
              Browse & Filter <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
