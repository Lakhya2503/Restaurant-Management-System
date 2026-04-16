import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { useMenu } from "@/hooks/useMenu";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

const DishDetailPage = () => {
  const { id } = useParams();
  const { menuItems, isLoading } = useMenu();
  const item = menuItems.find((m) => m.id === id);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState("");

  if (isLoading) {
    return (
      <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-muted-foreground">Loading dish details...</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Dish not found</h1>
          <Link to="/menu" className="text-primary font-body hover:underline">Back to Menu</Link>
        </div>
      </main>
    );
  }

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
    }
  };

  return (
    <main className="pt-24 pb-20 min-h-screen bg-background">
      <div className="container max-w-5xl">
        <Link to="/menu" className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col justify-center">
            <span className="font-body text-xs font-semibold text-primary tracking-widest uppercase mb-2">{item.category}</span>
            <h1 className="font-display text-4xl font-bold mb-3">{item.name}</h1>
            <p className="font-body text-muted-foreground mb-6 leading-relaxed">{item.description}</p>

            {item.ingredients && (
              <div className="mb-6">
                <h3 className="font-body text-sm font-semibold mb-2">Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {item.ingredients.map((ing) => (
                    <span key={ing} className="font-body text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{ing}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="font-body text-sm font-semibold mb-2 block">Special Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Any allergies or preferences?"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-card font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-6 mb-6">
              <span className="font-display text-3xl font-bold text-primary">₹{item.price}</span>
              <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1 rounded hover:bg-muted transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-body font-semibold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-1 rounded hover:bg-muted transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold py-3 text-base w-full md:w-auto">
              Add to Cart — ₹{item.price * qty}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DishDetailPage;
