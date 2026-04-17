import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { menuApi } from "@/lib/api";

const GalleryPage = () => {
  const [activeFilter, setActiveFilter] = useState<string>("All");
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


  const galleryItems = menuData.map((item) => ({
    title: item.itemName,
    category: item.itemCategory,
    image: item.itemImage,
  }));

  const galleryCategories = [
    ...new Set(menuData.map((item) => item.itemCategory)),
  ];

  const allCategories = ["All", ...galleryCategories];

  const filteredItems =
    activeFilter === "All"
      ? galleryItems
      : galleryItems.filter((g) => g.category === activeFilter);

  const sections =
    activeFilter === "All"
      ? galleryCategories
          .map((cat) => ({
            cat,
            items: galleryItems.filter((g) => g.category === cat),
          }))
          .filter((s) => s.items.length > 0)
      : [{ cat: activeFilter, items: filteredItems }];


  if (loading) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-secondary/80">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse-soft pointer-events-none" />
        <div className="absolute inset-0 hero-pattern pointer-events-none" />

        <div className="container relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-5 py-2 mb-6 animate-fade-in-down">
            <Camera className="w-4 h-4 text-primary" />
            <span className="font-body text-primary font-semibold text-xs tracking-widest uppercase">
              Our Gallery
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-6 animate-fade-in-up">
            A Feast for <span className="gradient-text">the Eyes</span>
          </h1>

          <p className="font-body text-secondary-foreground/70 text-lg md:text-xl max-w-xl mx-auto mb-10 animate-fade-in-up stagger-1">
            Discover the artistry behind every dish we serve — each plate is a masterpiece.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 animate-fade-in-up stagger-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`font-body text-sm font-medium px-5 py-2.5 rounded-full border transition-all hover-scale ${
                  activeFilter === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "border-secondary-foreground/20 text-secondary-foreground/70 hover:border-primary hover:text-primary backdrop-blur-sm"
                }`}
              >
                {cat}
                {cat === "All" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({galleryItems.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path
              d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Gallery Content */}
      <div className="container py-12 space-y-16">
        {sections.map(({ cat, items }) => (
          <section key={cat} className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
              <div className="p-3 rounded-xl bg-primary/10">
                <Camera className="w-5 h-5 text-primary" />
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">
                  {cat}
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? "photo" : "photos"}
                </p>
              </div>

              <div className="flex-1 h-px bg-border ml-4" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item, i) => (
                <div
                  key={`${cat}-${i}`}
                  className={`group relative rounded-2xl overflow-hidden shadow-lg hover-lift animate-fade-in-up stagger-${Math.min(
                    (i % 4) + 1,
                    4
                  )}`}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                    <div className="p-5 w-full">
                      <p className="font-display text-lg font-bold text-white">
                        {item.title}
                      </p>
                      <span className="font-body text-xs text-white/70">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default GalleryPage;
