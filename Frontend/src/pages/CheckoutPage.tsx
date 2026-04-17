import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useTableOrders } from "@/context/TableOrderContext";
import { CheckCircle2, CreditCard, FileText, IndianRupee, LogIn, MapPin, Minus, Phone, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck, User, UtensilsCrossed, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPage = () => {
  const { items, totalPrice, clearCart, updateQty, removeItem } = useCart();
  const { user, isLoggedIn } = useAuth();
  const { addOrder, getUserReservations } = useOrders();
  const { addTableOrder } = useTableOrders();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", payment: "razorpay", selectedAddressId: "" });
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "dine-in">("delivery");
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [tableNotes, setTableNotes] = useState("");
  const [successPopup, setSuccessPopup] = useState<{ show: boolean; orderId: string; type: string }>({ show: false, orderId: "", type: "" });

  // Prefill form with user data if logged in
  useEffect(() => {
    if (user) {
      const primaryAddress = user.addresses?.find((a) => a.isDefault);
      setForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        address: primaryAddress ? `${primaryAddress.addressLine}, ${primaryAddress.place} - ${primaryAddress.pinCode}` : prev.address,
        selectedAddressId: primaryAddress?._id || "",
      }));
    }
  }, [user]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleAddressSelect = (addressId: string) => {
    const selectedAddr = user?.addresses?.find((a) => a._id === addressId);
    if (selectedAddr) {
      setForm((prev) => ({
        ...prev,
        address: `${selectedAddr.addressLine}, ${selectedAddr.place} - ${selectedAddr.pinCode}`,
        selectedAddressId: addressId,
      }));
    }
  };


  const showSuccessAndRedirect = (orderId: string, type: string) => {
    setSuccessPopup({ show: true, orderId, type });
    clearCart();
    setTimeout(() => {
      setSuccessPopup({ show: false, orderId: "", type: "" });
      navigate("/profile/orders");
    }, 3000);
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderType === "dine-in") {
      if (tableNumber < 1) {
        toast.error("Please enter a valid table number");
        return;
      }
      setLoading(true);
      const newOrder = await addTableOrder({
        tableNumber,
        customerName: user!.name || form.name,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image,
        })),
        totalPrice,
        notes: tableNotes,
        status: "active",
      });
      setLoading(false);
      showSuccessAndRedirect(newOrder.id, "dine-in");
      return;
    }

    if (!form.name || !form.phone || !form.address) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      // 1. Create order and get payment intent from backend
      const result = await addOrder({
        userId: user!.id,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image,
        })),
        totalPrice,
        contact: {
          name: form.name,
          phone: form.phone,
          address: form.address,
        },
        payment: form.payment === "razorpay" ? "Online" : (form.payment === "direct" ? "Direct" : "Cash On Delivery"),
        status: "pending",
      });

      const { order, payment } = result;

      // 2. If Razorpay was selected, open the modal
      if (form.payment === "razorpay" && payment) {
        const res = await loadRazorpayScript();
        if (!res) {
          toast.error("Razorpay SDK failed to load. Are you online?");
          setLoading(false);
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
          amount: totalPrice * 100,
          currency: "INR",
          name: "Athenura Restaurant",
          description: `Order #${order.id}`,
          order_id: payment, // This is the ID returned by razorpay.orders.create on backend
          handler: async function (response: any) {
            console.log("Payment successful:", response);
            setLoading(false);
            showSuccessAndRedirect(order.id, "delivery");
          },
          prefill: {
            name: form.name || user?.name || "",
            email: user?.email || "",
            contact: form.phone || "",
          },
          theme: {
            color: "#D97706",
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
              toast.info("Payment modal closed. You can track your pending order in profile.");
              navigate("/profile/orders");
            }
          }
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      } else {
        // COD path or failed payment intent
        setLoading(false);
        if (order?.id) {
          showSuccessAndRedirect(order.id, "delivery");
        } else {
          throw new Error("Order was created but ID is missing.");
        }
      }
    } catch (err: any) {
      console.error("Order process error:", err);
      const msg = err?.message || "Something went wrong while placing your order.";
      toast.error(`Error: ${msg}`);
      setLoading(false);
    }
  };

  if (items.length === 0 && !successPopup.show) {
    return (
      <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4 animate-fade-in-up">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Your Cart is Empty</h1>
          <p className="font-body text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet. Explore our menu and find something delicious!</p>
          <Button onClick={() => navigate("/menu")} className="bg-primary text-primary-foreground font-body px-8 py-3">
            Browse Menu
          </Button>
        </div>
      </main>
    );
  }

  // Require login before checkout
  if (!isLoggedIn) {
    return (
      <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4 animate-fade-in-up">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Login Required</h1>
          <p className="font-body text-muted-foreground mb-6">
            Please login to place your order. This helps us keep track of your orders and provide better service.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/login", { state: { from: "/checkout" } })}
              className="w-full bg-primary text-primary-foreground font-body"
            >
              Login to Continue
            </Button>
            <Button
              onClick={() => navigate("/menu")}
              variant="outline"
              className="w-full font-body"
            >
              Back to Menu
            </Button>
          </div>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="font-body text-sm text-muted-foreground">
              <strong>Why login?</strong> Your cart items are saved, and you can track your orders anytime in your profile.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const deliveryCharge = orderType === "dine-in" ? 0 : (totalPrice >= 500 ? 0 : 40);
  const grandTotal = totalPrice + deliveryCharge;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-secondary via-secondary/95 to-secondary pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-primary/50 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
        </div>
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full mb-4">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-body text-sm font-semibold">{items.length} {items.length === 1 ? "item" : "items"} in cart</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">Checkout</h1>
            <p className="font-body text-white/70 text-lg">Almost there! Complete your order details below.</p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="font-body text-sm">Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-5 h-5 text-primary" />
              <span className="font-body text-sm">Free Delivery over ₹500</span>
            </div>
          </div>
        </div>
      </section>

      {/* Checkout Content */}
      <section className="py-10">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Order Type Selector */}
              <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-display text-sm font-bold text-primary">0</span>
                  </div>
                  <h2 className="font-display text-xl font-semibold">Order Type</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderType("delivery")}
                    className={`flex items-center gap-4 p-5 border-2 rounded-xl transition-all text-left ${
                      orderType === "delivery" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-body font-semibold">Home Delivery</p>
                      <p className="font-body text-xs text-muted-foreground">Get food delivered to your doorstep</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("dine-in")}
                    className={`flex items-center gap-4 p-5 border-2 rounded-xl transition-all text-left ${
                      orderType === "dine-in" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-body font-semibold">Dine-In Table Order</p>
                      <p className="font-body text-xs text-muted-foreground">Order to your table at the restaurant</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cart Items - Editable */}
              <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-display text-sm font-bold text-primary">1</span>
                  </div>
                  <h2 className="font-display text-xl font-semibold">Your Items</h2>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 group hover:border-primary/30 transition-colors">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body font-semibold text-sm truncate">{item.name}</h4>
                        <p className="font-body text-sm text-primary font-bold">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-1.5 rounded-lg bg-background border border-border hover:border-primary hover:text-primary transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-body text-sm font-bold w-7 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-1.5 rounded-lg bg-background border border-border hover:border-primary hover:text-primary transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-body text-sm font-bold">₹{(item.price * item.qty).toFixed(0)}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery / Table Details */}
              <form onSubmit={handleOrder} id="checkout-form" className="space-y-6">

                {/* Dine-In Table Details */}
                {orderType === "dine-in" && (
                  <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-primary">2</span>
                      </div>
                      <h2 className="font-display text-xl font-semibold">Table Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-body text-sm font-medium mb-2 block">Table Number *</label>
                        <input
                          type="number"
                          min={1}
                          value={tableNumber}
                          onChange={(e) => setTableNumber(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-body text-sm font-medium mb-2 block">Your Name</label>
                        <input
                          value={user?.name || ""}
                          disabled
                          className="w-full px-4 py-3 rounded-xl border border-border bg-muted font-body text-sm text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="font-body text-sm font-medium mb-2 block">Special Notes (optional)</label>
                      <textarea
                        value={tableNotes}
                        onChange={(e) => setTableNotes(e.target.value)}
                        placeholder="Any dietary requirements or special requests..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                      />
                    </div>
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <p className="font-body text-xs text-orange-700 flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Your order will be served directly to <strong>Table {tableNumber}</strong>. No delivery charge for dine-in orders.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery Details - only for delivery */}
                {orderType === "delivery" && (
                  <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-primary">2</span>
                      </div>
                      <h2 className="font-display text-xl font-semibold">Delivery Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full Name *" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone Number *" type="tel" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                      </div>
                    </div>

                    {user?.addresses && user.addresses.length > 0 && (
                      <div className="mt-4">
                        <label className="font-body text-sm font-medium mb-3 block flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" /> Saved Addresses
                        </label>
                        <div className="grid grid-cols-1 gap-3 mb-3">
                          {user.addresses.map((addr) => (
                            <label
                              key={addr._id}
                              className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                form.selectedAddressId === addr._id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="savedAddress"
                                checked={form.selectedAddressId === addr._id}
                                onChange={() => handleAddressSelect(addr._id)}
                                className="mt-1 w-4 h-4 text-primary"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-body font-semibold text-sm">{addr.label || "Address"}</p>
                                  {addr.isDefault && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="font-body text-xs text-muted-foreground">
                                  {addr.addressLine}, {addr.place} - {addr.pinCode}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <p className="font-body text-xs text-muted-foreground">Or enter a new address below:</p>
                      </div>
                    )}

                    <div className="relative mt-4">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                      <textarea value={form.address} onChange={(e) => { update("address", e.target.value); setForm((p) => ({ ...p, selectedAddressId: "" })); }} placeholder="Delivery Address *" rows={3} className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none" required />
                    </div>
                  </div>
                )}

                {/* Payment Method - only for delivery */}
                {orderType === "delivery" && (
                  <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in-up stagger-2">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-primary">3</span>
                      </div>
                      <h2 className="font-display text-xl font-semibold">Payment Method</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Cash on Delivery */}
                      <label className={`flex flex-col items-center text-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${form.payment === "cod" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                        <input type="radio" name="payment" value="cod" checked={form.payment === "cod"} onChange={(e) => update("payment", e.target.value)} className="sr-only" />
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                          <Wallet className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="font-body font-bold text-sm">Cash on Delivery</p>
                        <p className="font-body text-[10px] text-muted-foreground mt-1">Pay when you receive</p>
                      </label>

                      {/* Online Payment (Razorpay) */}
                      <label className={`flex flex-col items-center text-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${form.payment === "razorpay" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                        <input type="radio" name="payment" value="razorpay" checked={form.payment === "razorpay"} onChange={(e) => update("payment", e.target.value)} className="sr-only" />
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="font-body font-bold text-sm">Pay Online</p>
                        <p className="font-body text-[10px] text-muted-foreground mt-1">UPI, Cards, Wallets</p>
                      </label>

                      {/* Direct Payment */}
                      {/* <label className={`flex flex-col items-center text-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${form.payment === "direct" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                        <input type="radio" name="payment" value="direct" checked={form.payment === "direct"} onChange={(e) => update("payment", e.target.value)} className="sr-only" />
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                          <IndianRupee className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="font-body font-bold text-sm">Direct Payment</p>
                        <p className="font-body text-[10px] text-muted-foreground mt-1">Scan QR / Bank Transfer</p>
                      </label> */}
                    </div>

                    {form.payment === "razorpay" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 flex items-start gap-3 animate-fade-in">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-blue-100 flex-shrink-0">
                          <img src="https://razorpay.com/favicon.png" alt="Razorpay" className="w-5 h-5" />
                        </div>
                        <p className="font-body text-[11px] text-blue-700 leading-relaxed">
                          <strong>Razorpay Secure:</strong> You will be redirected to the secure gateway for UPI, Cards, and Netbanking.
                        </p>
                      </div>
                    )}

                    {form.payment === "direct" && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-4 animate-fade-in">
                        <p className="font-body text-[11px] text-purple-700 leading-relaxed">
                          <strong>Contact Required:</strong> Please contact the restaurant staff at <strong>+91 99999 00000</strong> for the UPI QR code or bank details to complete your direct transfer.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1 animate-fade-in-up stagger-2">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-5">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Order Summary</h2>
                </div>

                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center font-body text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{item.name}</span>
                        <span className="text-xs text-muted-foreground">×{item.qty}</span>
                      </div>
                      <span className="font-semibold ml-3">₹{(item.price * item.qty).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2.5">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{totalPrice.toFixed(0)}</span>
                  </div>
                  {orderType === "delivery" && (
                    <>
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className={`font-medium ${deliveryCharge === 0 ? "text-green-600" : ""}`}>
                          {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                        </span>
                      </div>
                      {deliveryCharge > 0 && (
                        <p className="font-body text-xs text-muted-foreground">Add ₹{500 - totalPrice} more for free delivery</p>
                      )}
                    </>
                  )}
                  {orderType === "dine-in" && (
                    <div className="flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium text-green-600">Dine-In (Free)</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between font-body font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="checkout-form"
                  disabled={loading}
                  className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold py-6 text-base rounded-xl transition-all hover-scale active:scale-95 shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                       <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       Processing...
                    </div>
                  ) : orderType === "dine-in" ? (
                    <span className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4" /> Place Table Order — ₹{totalPrice.toFixed(0)}
                    </span>
                  ) : form.payment === "razorpay" ? (
                    <div className="flex items-center justify-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Pay ₹{grandTotal.toFixed(0)} Online
                    </div>
                  ) : form.payment === "direct" ? (
                    <div className="flex items-center justify-center gap-2">
                       <IndianRupee className="w-5 h-5" />
                       Pay ₹{grandTotal.toFixed(0)} Directly
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                       <Wallet className="w-5 h-5" />
                       Place COD Order — ₹{grandTotal.toFixed(0)}
                    </div>
                  )}
                </Button>

                <p className="font-body text-xs text-muted-foreground text-center mt-3">
                  By placing your order, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Popup Overlay */}
      {successPopup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="relative bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => { setSuccessPopup({ show: false, orderId: "", type: "" }); navigate("/profile/orders"); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated check circle */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Sparkles */}
            <div className="flex justify-center gap-1 mb-3">
              <Sparkles className="w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <Sparkles className="w-4 h-4 text-yellow-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <Sparkles className="w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {successPopup.type === "dine-in" ? "Table Order Placed!" : "Order Placed Successfully!"}
            </h2>
            <p className="font-body text-muted-foreground mb-4">
              {successPopup.type === "dine-in"
                ? "Your food will be served at your table shortly."
                : "Your order is being prepared and will be delivered soon."}
            </p>

            <div className="bg-muted/50 rounded-xl px-4 py-3 mb-5">
              <p className="font-body text-xs text-muted-foreground">Order ID</p>
              <p className="font-body font-bold text-primary text-lg">{successPopup.orderId}</p>
            </div>

            {/* Progress bar auto-dismiss */}
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full" style={{ animation: "shrink 3s linear forwards" }} />
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2">Redirecting to your orders...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </main>
  );
};

export default CheckoutPage;
