import { Link } from "react-router-dom";
import { UtensilsCrossed, Heart, Award, Users, Sparkles, Leaf, ArrowRight } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

const StatCounter = ({ value, label }: { value: string; label: string }) => {
  // Extract number from value (e.g., "5+" -> 5, "10K+" -> 10000, "4.5/5★" -> 45)
  const numericValue = value.includes("K") 
    ? parseFloat(value.replace("K+", "")) * 1000
    : value.includes("/5★")
    ? parseFloat(value.replace("/5★", "")) * 10 // Multiply by 10 for decimal precision
    : parseFloat(value.replace(/[^\d.]/g, ""));
  
  const { count, elementRef } = useCountUp({ end: numericValue, duration: 2500 });
  
  // Format the count back to original format
  const formatCount = (num: number) => {
    if (value.includes("K+")) {
      return `${(num / 1000).toFixed(num >= 1000 ? 0 : 1)}K+`;
    } else if (value.includes("/5★")) {
      return `${(num / 10).toFixed(1)}/5★`;
    } else if (value.includes("+")) {
      return `${num}+`;
    }
    return num.toString();
  };

  return (
    <div ref={elementRef} className="text-center group animate-bounce-in">
      <div className="mb-3 relative inline-block">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
        <p className="font-body text-5xl md:text-6xl font-black gradient-text relative hover-scale tracking-tight">
          {formatCount(count)}
        </p>
      </div>
      <p className="font-body text-sm md:text-base text-muted-foreground font-medium">
        {label}
      </p>
    </div>
  );
};

const AboutPage = () => {
  const values = [
    {
      icon: UtensilsCrossed,
      title: "Authentic Flavors",
      desc: "We stay true to traditional recipes passed down through generations, using authentic spices and cooking methods to deliver genuine Indian taste.",
    },
    {
      icon: Heart,
      title: "Made with Love",
      desc: "Every dish is prepared with care and passion. Our chefs treat each order as if they're cooking for their own family, ensuring quality in every bite.",
    },
    {
      icon: Award,
      title: "Quality Ingredients",
      desc: "We source fresh, locally-grown vegetables, premium meats, and authentic spices. No compromises on quality, ever.",
    },
    {
      icon: Users,
      title: "Community First",
      desc: "We're more than a restaurant — we're part of the community. We support local farmers, employ local talent, and give back to society.",
    },
  ];

  const stats = [
    { value: "5+", label: "Years of Excellence" },
    { value: "50+", label: "Signature Dishes" },
    { value: "10K+", label: "Happy Customers" },
    { value: "4.5/5★", label: "Average Rating" },
  ];

  const milestones = [
    {
      year: "2020",
      title: "The First Kitchen",
      desc: "Started as a family-run kitchen with a focused menu of regional Indian classics.",
    },
    {
      year: "2022",
      title: "Community Favorite",
      desc: "Expanded our team and menu after earning loyal local support and repeat guests.",
    },
    {
      year: "Today",
      title: "Tradition Meets Modern",
      desc: "Continuing to serve authentic flavor with refined presentation and warm hospitality.",
    },
  ];

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-secondary/80">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse-soft pointer-events-none" />
        <div className="absolute top-20 right-[20%] w-20 h-20 border-2 border-primary/20 rounded-full animate-float-slow pointer-events-none" />
        <div className="absolute bottom-32 left-[15%] w-10 h-10 border border-primary/15 rounded-full animate-pulse-soft pointer-events-none" />
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        
        <div className="container relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-5 py-2 mb-6 animate-fade-in-down">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-body text-primary font-semibold text-xs tracking-widest uppercase">Our Story</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-6 animate-fade-in-up">
            About <span className="gradient-text">Athenura Restaurant</span>
          </h1>
          <p className="font-body text-secondary-foreground/70 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto animate-fade-in-up stagger-1">
            Founded in 2020, Athenura Restaurant is a celebration of culinary art — blending time-honored Indian traditions with modern innovation. Every dish is crafted from locally sourced, seasonal ingredients by our team of passionate chefs.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto animate-fade-in-up stagger-2">
            <div className="bg-secondary-foreground/5 backdrop-blur-sm border border-secondary-foreground/15 rounded-xl px-4 py-3">
              <p className="font-body text-xs uppercase tracking-wider text-secondary-foreground/60">Signature Dishes</p>
              <p className="font-display text-2xl font-bold text-secondary-foreground">50+</p>
            </div>
            <div className="bg-secondary-foreground/5 backdrop-blur-sm border border-secondary-foreground/15 rounded-xl px-4 py-3">
              <p className="font-body text-xs uppercase tracking-wider text-secondary-foreground/60">Happy Guests</p>
              <p className="font-display text-2xl font-bold text-secondary-foreground">10K+</p>
            </div>
            <div className="bg-secondary-foreground/5 backdrop-blur-sm border border-secondary-foreground/15 rounded-xl px-4 py-3">
              <p className="font-body text-xs uppercase tracking-wider text-secondary-foreground/60">Average Rating</p>
              <p className="font-display text-2xl font-bold text-secondary-foreground">4.5/5</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      <div className="container max-w-6xl py-16">
        {/* Journey Section with Image */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="relative animate-slide-in-left">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="bg-card border border-border rounded-3xl p-8 hover-lift relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-3xl font-bold">Our Journey</h2>
              </div>
              <div className="space-y-4 font-body text-muted-foreground leading-relaxed">
                <p>
                  Athenura Restaurant was born from a simple dream: to bring authentic Indian flavors to food lovers while honoring the rich culinary heritage of India. What started as a small family kitchen in Mumbai has grown into a beloved restaurant.
                </p>
                <p>
                  Our name reflects our philosophy. Just as a garden nurtures diverse plants, we celebrate the incredible variety of Indian cuisine — from fiery curries to aromatic biryanis, from tandoori delights to coastal seafood specialties.
                </p>
              </div>
            </div>
          </div>

          <div className="relative animate-slide-in-right">
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="bg-card border border-border rounded-3xl p-8 hover-lift relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-3xl font-bold">Our Philosophy</h2>
              </div>
              <div className="space-y-4 font-body text-muted-foreground leading-relaxed">
                <p>
                  Every spice in our kitchen tells a story. We source our ingredients directly from local farmers and trusted suppliers, ensuring that each dish captures the true essence of Indian cooking.
                </p>
                <p>
                  Our chefs, trained in traditional techniques and modern culinary arts, pour their heart into every plate that leaves our kitchen. Quality, authenticity, and innovation are at the core of everything we do.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in-up">
            What Makes Us <span className="gradient-text">Special</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                className={`group bg-card border border-border rounded-2xl p-6 hover-lift animate-fade-in-up stagger-${i + 1} relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {value.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in-up">
            Our <span className="gradient-text">Timeline</span>
          </h2>

          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-2 bottom-2 w-px bg-border -translate-x-1/2" />
            <div className="space-y-6 md:space-y-8">
              {milestones.map((item, i) => (
                <div key={item.title} className={`grid md:grid-cols-2 gap-4 md:gap-10 items-center animate-fade-in-up stagger-${i + 1}`}>
                  <div className={`bg-card border border-border rounded-2xl p-6 hover-lift ${i % 2 === 1 ? "md:order-2" : ""}`}>
                    <p className="font-body text-xs font-semibold tracking-widest text-primary uppercase mb-2">{item.year}</p>
                    <h3 className="font-display text-2xl font-bold mb-2">{item.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>

                  <div className={`hidden md:flex justify-center ${i % 2 === 1 ? "md:order-1" : ""}`}>
                    <span className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-8 md:p-12 animate-fade-in-up">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10">
            Our <span className="gradient-text">Achievements</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <StatCounter key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-card border border-border rounded-3xl p-8 md:p-10 text-center animate-fade-in-up relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 relative">Experience Athenura Restaurant</h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mb-8 relative">
            Ready for bold spices, comforting classics, and memorable hospitality? Explore our menu or reserve your table in seconds.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <Link
              to="/menu"
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground font-body font-semibold px-7 py-3.5 rounded-xl hover:bg-primary/90 transition-all hover-lift"
            >
              View Menu
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/reservation"
              className="inline-flex items-center gap-2 border-2 border-border font-body font-semibold px-7 py-3.5 rounded-xl hover:border-primary hover:text-primary transition-all hover-lift"
            >
              Reserve a Table
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AboutPage;


