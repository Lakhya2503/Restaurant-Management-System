import { useState, useMemo } from "react";
import { Search, ChevronDown, SlidersHorizontal, X, Leaf, Drumstick } from "lucide-react";
import { useMenu } from "@/hooks/useMenu";
import MenuCard from "@/components/MenuCard";

type SortOption = "default" | "price-low" | "price-high";
type DietFilter = "all" | "veg" | "nonveg";

const filterCategories = ["Starters", "Main Course", "Pizza & Pasta", "Desserts", "Salads", "Biryani"];

const FilterSection = ({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) => {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3 px-1 font-body text-sm font-bold text-foreground uppercase tracking-wide hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96 pb-3" : "max-h-0"}`}>
        {children}
      </div>
    </div>
  );
};

const MenuPage = () => {
  const { menuItems, isLoading } = useMenu();
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("default");
  const [diet, setDiet] = useState<DietFilter>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (name: string) => setOpenSection((prev) => (prev === name ? null : name));

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filtered = useMemo(() => {
    let result = menuItems.filter((item) => {
      const matchCat = activeCategories.length === 0 || activeCategories.includes(item.category);
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
      const matchDiet = diet === "all" || (diet === "veg" ? item.isVeg : !item.isVeg);
      return matchCat && matchSearch && matchDiet && item.isAvailable;
    });
    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    else if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [activeCategories, search, sort, diet]);

  const activeFilters = [
    ...activeCategories.map((cat) => ({ label: cat, clear: () => toggleCategory(cat) })),
    ...(diet !== "all" ? [{ label: diet === "veg" ? "Veg Only" : "Non-Veg Only", clear: () => setDiet("all") }] : []),
    ...(sort !== "default" ? [{ label: sort === "price-low" ? "Price: Low → High" : "Price: High → Low", clear: () => setSort("default") }] : []),
  ];

  const clearAll = () => { setActiveCategories([]); setDiet("all"); setSort("default"); };

  const FilterContent = ({ onSelect }: { onSelect?: () => void }) => (
    <>
      <FilterSection title="CATEGORIES" isOpen={openSection === "categories"} onToggle={() => toggleSection("categories")}>
        <div className="flex flex-col">
          {filterCategories.map((cat) => {
            const isChecked = activeCategories.includes(cat);
            return (
              <label
                key={cat}
                className="flex items-center gap-3 px-1 py-1.5 cursor-pointer group"
                onClick={() => { toggleCategory(cat); onSelect?.(); }}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  isChecked ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary"
                }`}>
                  {isChecked && (
                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`font-body text-[13px] ${isChecked ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {cat}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="DIET" isOpen={openSection === "diet"} onToggle={() => toggleSection("diet")}>
        <div className="flex flex-col gap-1">
          {([
            { value: "veg" as DietFilter, label: "Pure Veg", icon: Leaf, color: "text-green-600" },
            { value: "nonveg" as DietFilter, label: "Non-Veg", icon: Drumstick, color: "text-red-600" },
          ]).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-1 py-1.5 cursor-pointer group"
              onClick={() => { setDiet(diet === opt.value ? "all" : opt.value); onSelect?.(); }}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                diet === opt.value
                  ? opt.value === "veg" ? "bg-green-600 border-green-600" : "bg-red-600 border-red-600"
                  : "border-muted-foreground/40 group-hover:border-primary"
              }`}>
                {diet === opt.value && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                {opt.icon && <opt.icon className={`w-3.5 h-3.5 ${opt.color}`} />}
                <span className={`font-body text-[13px] ${diet === opt.value ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {opt.label}
                </span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="PRICE" isOpen={openSection === "price"} onToggle={() => toggleSection("price")}>
        <div className="flex flex-col gap-1">
          {([
            { value: "default" as SortOption, label: "Relevance" },
            { value: "price-low" as SortOption, label: "Low to High" },
            { value: "price-high" as SortOption, label: "High to Low" },
          ]).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-1 py-1.5 cursor-pointer group"
              onClick={() => { setSort(opt.value); onSelect?.(); }}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                sort === opt.value ? "border-primary" : "border-muted-foreground/40 group-hover:border-primary"
              }`}>
                {sort === opt.value && <span className="w-2 h-2 rounded-full bg-primary" />}
              </span>
              <span className={`font-body text-[13px] ${sort === opt.value ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="AVAILABILITY" isOpen={openSection === "availability"} onToggle={() => toggleSection("availability")}>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-3 px-1 py-1.5 cursor-pointer group">
            <span className="w-4 h-4 rounded border-2 bg-primary border-primary flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="font-body text-[13px] font-semibold text-foreground">In Stock Only</span>
          </label>
        </div>
      </FilterSection>
    </>
  );

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-secondary/80">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse-soft pointer-events-none" />
        <div className="absolute inset-0 hero-pattern pointer-events-none" />

        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-5 py-2 mb-6 animate-fade-in-down">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-body text-primary font-semibold text-xs tracking-widest uppercase">Our Menu</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-6 animate-fade-in-up">
            Explore Our <span className="gradient-text">Flavors</span>
          </h1>
          <p className="font-body text-secondary-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-1">
            Discover a curated collection of dishes crafted with passion, tradition, and the finest ingredients.
          </p>
          <div className="relative max-w-lg mx-auto animate-fade-in-up stagger-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-foreground/40" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 backdrop-blur-md font-body text-base text-secondary-foreground placeholder:text-secondary-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Content */}
      <div className="container py-8">
        <div className="flex gap-6">
          {/* Left Sidebar — Flipkart Style */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 animate-slide-in-left">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Sidebar header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-body text-sm font-bold text-foreground">Filters</h3>
                  {activeFilters.length > 0 && (
                    <button onClick={clearAll} className="font-body text-xs font-semibold text-primary hover:underline">
                      CLEAR ALL
                    </button>
                  )}
                </div>
                {/* Scrollable filter sections */}
                <div className="px-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                  <FilterContent />
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 bg-primary text-primary-foreground p-4 rounded-full shadow-xl shadow-primary/30 hover-scale animate-bounce-in"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Mobile Filter Drawer */}
          {mobileFilterOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFilterOpen(false)} />
              <div className="relative ml-auto w-80 max-w-[85vw] bg-background h-full overflow-y-auto shadow-2xl animate-slide-in-right">
                <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="font-body text-base font-bold">Filters</h3>
                  <div className="flex items-center gap-3">
                    {activeFilters.length > 0 && (
                      <button onClick={clearAll} className="font-body text-xs font-semibold text-primary">CLEAR ALL</button>
                    )}
                    <button onClick={() => setMobileFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="px-5 pb-6">
                  <FilterContent onSelect={() => setMobileFilterOpen(false)} />
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Active Filters Bar */}
            <div className="flex items-center gap-2 mb-5 flex-wrap animate-fade-in">
              <span className="font-body text-sm text-muted-foreground">
                <strong className="text-foreground">{filtered.length}</strong> results
              </span>
              {activeFilters.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-body text-xs font-semibold px-3 py-1 rounded-full">
                  {f.label}
                  <button onClick={f.clear} className="hover:bg-primary/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-48 bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-muted rounded w-16" />
                        <div className="h-8 bg-muted rounded w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                <p className="font-body text-muted-foreground text-lg">No dishes found. Try a different search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((item, i) => (
                  <div key={item.id} className={`animate-fade-in-up stagger-${Math.min(i % 4 + 1, 4)}`}>
                    <MenuCard item={item} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MenuPage;
