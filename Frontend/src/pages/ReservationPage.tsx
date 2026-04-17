import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, Clock, Users, LogIn, CheckCircle2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/context/OrderContext";
import { useNavigate } from "react-router-dom";

// Custom debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Constants
const RESERVATION_START_HOUR = 8;
const RESERVATION_END_HOUR = 20;
const MIN_DURATION_MINUTES = 60;
const MIN_ADVANCE_NOTICE_MINUTES = 30;

const reservationStartSlots = Array.from(
  { length: RESERVATION_END_HOUR - RESERVATION_START_HOUR },
  (_, i) => `${String(i + RESERVATION_START_HOUR).padStart(2, "0")}:00`
);

const reservationEndSlots = Array.from(
  { length: RESERVATION_END_HOUR - RESERVATION_START_HOUR },
  (_, i) => `${String(i + RESERVATION_START_HOUR + 1).padStart(2, "0")}:00`
);

// Utility functions
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const getMinDate = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const isValidReservationRange = (startTime: string, endTime: string, date: string): boolean => {
  if (!startTime || !endTime || !date) return false;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Check business hours
  if (startMinutes < timeToMinutes("08:00") || endMinutes > timeToMinutes("20:00")) {
    return false;
  }

  // Check time order
  if (startMinutes >= endMinutes) {
    return false;
  }

  // Check minimum duration (1 hour)
  if (endMinutes - startMinutes < MIN_DURATION_MINUTES) {
    return false;
  }

  // Check if time is valid for today
  if (isToday(date)) {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    if (startMinutes <= currentTimeInMinutes + MIN_ADVANCE_NOTICE_MINUTES) {
      return false;
    }
  }

  return true;
};

// Form state interface
interface ReservationForm {
  name: string;
  phone: string;
  guests: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const ReservationPage = () => {
  const { user, isLoggedIn } = useAuth();
  const { addReservation, getAvailableTables, getTableRangeForGuests } = useOrders();
  const navigate = useNavigate();

  const [form, setForm] = useState<ReservationForm>({
    name: "",
    phone: "",
    guests: "2",
    date: "",
    startTime: "",
    endTime: "",
    notes: ""
  });

  const [successPopup, setSuccessPopup] = useState<{
    show: boolean;
    bookingId: string;
    tableNumber?: number
  }>({
    show: false,
    bookingId: "",
    tableNumber: undefined,
  });

  const [availableTables, setAvailableTables] = useState<number[]>([]);
  const [isCheckingTables, setIsCheckingTables] = useState(false);

  const guestsCount = parseInt(form.guests, 10);
  const tableRange = getTableRangeForGuests(guestsCount);

  // Debounce form fields to prevent excessive API calls
  const debouncedDate = useDebounce(form.date, 500);
  const debouncedStartTime = useDebounce(form.startTime, 500);
  const debouncedEndTime = useDebounce(form.endTime, 500);

  // Prefill form with user data if logged in
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  // Get filtered start time slots based on date
  const filteredStartSlots = useMemo(() => {
    if (!form.date) return reservationStartSlots;

    if (isToday(form.date)) {
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      return reservationStartSlots.filter(slot => {
        const slotMinutes = timeToMinutes(slot);
        // Allow slots that are at least 30 minutes from now
        return slotMinutes > currentTimeInMinutes + MIN_ADVANCE_NOTICE_MINUTES;
      });
    }

    return reservationStartSlots;
  }, [form.date]);

  // Get filtered end time slots based on start time and date
  const filteredEndSlots = useMemo(() => {
    let filtered = [...reservationEndSlots];

    // Filter by start time
    if (form.startTime) {
      filtered = filtered.filter(
        (slot) => timeToMinutes(slot) > timeToMinutes(form.startTime)
      );
    }

    // Filter by date if today
    if (form.date && isToday(form.date) && form.startTime) {
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      const startTimeMinutes = timeToMinutes(form.startTime);

      // If start time is in the future, ensure end time is also valid
      if (startTimeMinutes > currentTimeInMinutes) {
        filtered = filtered.filter(slot => {
          const endMinutes = timeToMinutes(slot);
          return endMinutes > startTimeMinutes &&
                 (endMinutes - startTimeMinutes) >= MIN_DURATION_MINUTES;
        });
      }
    }

    return filtered;
  }, [form.startTime, form.date]);

  // Fetch available tables with debouncing
  useEffect(() => {
    const fetchTables = async () => {
      // Only fetch if all required fields have valid values
      if (!debouncedDate || !debouncedStartTime || !debouncedEndTime) {
        if (availableTables.length !== 0) setAvailableTables([]);
        return;
      }

      // Validate time range before making API call
      if (!isValidReservationRange(debouncedStartTime, debouncedEndTime, debouncedDate)) {
        if (availableTables.length !== 0) setAvailableTables([]);
        return;
      }

      setIsCheckingTables(true);

      try {
        const tables = await getAvailableTables(
          debouncedDate,
          debouncedStartTime,
          debouncedEndTime,
          guestsCount
        );
        setAvailableTables(tables);
      } catch (error) {
        console.error("Error fetching available tables:", error);
        setAvailableTables([]);
        toast.error("Failed to check table availability. Please try again.");
      } finally {
        setIsCheckingTables(false);
      }
    };

    fetchTables();
  }, [debouncedDate, debouncedStartTime, debouncedEndTime, guestsCount, getAvailableTables]);

  const hasSlotSelection = Boolean(form.date && form.startTime && form.endTime);

  const updateField = useCallback((field: keyof ReservationForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Reset end time when date or start time changes
      if (field === "date" || field === "startTime") {
        next.endTime = "";
      }

      // Reset start time and end time if date changes and it's today with invalid times
      if (field === "date" && value && isToday(value)) {
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        // Check if current start time is valid for today
        if (next.startTime && timeToMinutes(next.startTime) <= currentTimeInMinutes + MIN_ADVANCE_NOTICE_MINUTES) {
          next.startTime = "";
          next.endTime = "";
        }
      }

      // Ensure end time is always after selected start time
      if (
        (field === "startTime" || field === "endTime") &&
        next.startTime &&
        next.endTime &&
        timeToMinutes(next.endTime) <= timeToMinutes(next.startTime)
      ) {
        next.endTime = "";
      }

      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!form.name || !form.phone || !form.date || !form.startTime || !form.endTime) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Validate time range
    if (!isValidReservationRange(form.startTime, form.endTime, form.date)) {
      toast.error("Please select a valid time range. Minimum 1 hour duration. For today, please select a time at least 30 minutes from now.");
      return;
    }

    // Check table availability
    if (availableTables.length === 0) {
      toast.error("No tables available for this date/time range. Please choose another slot.");
      return;
    }

    // Create reservation
    try {
      const assignedTable = availableTables[0];
      const newReservation = await addReservation(
        {
          userId: user!.id,
          name: form.name,
          email: user?.email,
          phone: form.phone,
          guests: guestsCount,
          date: form.date,
          time: form.startTime,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes,
          status: "pending",
        },
        assignedTable
      );

      setSuccessPopup({
        show: true,
        bookingId: newReservation.id,
        tableNumber: newReservation.assignedTable
      });

      // Auto redirect after 3 seconds
      setTimeout(() => {
        setSuccessPopup({ show: false, bookingId: "", tableNumber: undefined });
        navigate("/profile/reservations");
      }, 3000);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reserve table right now");
    }
  };

  // Require login before making reservation
  if (!isLoggedIn) {
    return (
      <main className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Login Required</h1>
          <p className="font-body text-muted-foreground mb-6">
            Please login to make a table reservation. This helps us manage your bookings and send you confirmations.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/login", { state: { from: "/reservation" } })}
              className="w-full bg-primary text-primary-foreground font-body"
            >
              Login to Continue
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full font-body"
            >
              Back to Home
            </Button>
          </div>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="font-body text-sm text-muted-foreground">
              <strong>Why login?</strong> Track your reservations, receive confirmations, and manage bookings easily from your profile.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-secondary/80">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse-soft pointer-events-none" />
        <div className="absolute top-24 right-[15%] w-14 h-14 border-2 border-primary/20 rounded-full animate-float-slow pointer-events-none" />
        <div className="absolute bottom-28 left-[20%] w-8 h-8 border border-primary/15 rounded-full animate-pulse-soft pointer-events-none" />
        <div className="absolute inset-0 hero-pattern pointer-events-none" />

        <div className="container relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-5 py-2 mb-6 animate-fade-in-down">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="font-body text-primary font-semibold text-xs tracking-widest uppercase">Reserve a Table</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-6 animate-fade-in-up">
            Book Your <span className="gradient-text">Experience</span>
          </h1>
          <p className="font-body text-secondary-foreground/70 text-lg md:text-xl max-w-xl mx-auto animate-fade-in-up stagger-1">
            Secure your spot for a memorable dining experience. We look forward to hosting you.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      <div className="container max-w-2xl py-12">
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 md:p-10 space-y-5 hover-lift animate-scale-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="font-body text-sm font-medium mb-1.5 block">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="font-body text-sm font-medium mb-1.5 block">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="font-body text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Guests
              </label>
              <select
                value={form.guests}
                onChange={(e) => updateField("guests", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="font-body text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Start *
              </label>
              <select
                value={form.startTime}
                onChange={(e) => updateField("startTime", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!form.date}
                required
              >
                <option value="">Select start time</option>
                {filteredStartSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {form.date && isToday(form.date) && filteredStartSlots.length === 0 && (
                <p className="font-body text-[11px] text-destructive mt-1">No available start times for today</p>
              )}
            </div>
            <div>
              <label className="font-body text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> End *
              </label>
              <select
                value={form.endTime}
                onChange={(e) => updateField("endTime", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!form.startTime}
                required
              >
                <option value="">Select end time</option>
                {filteredEndSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              <p className="font-body text-[11px] text-muted-foreground mt-1">
                Time window: 08:00 AM to 08:00 PM (Minimum 1 hour)
              </p>
            </div>
          </div>

          {/* Available Tables Section */}
          {hasSlotSelection && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              {isCheckingTables ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="font-body text-xs text-muted-foreground ml-2">Checking availability...</p>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-2">
                  <p className="font-body text-sm text-destructive font-medium">
                    No tables are available for this slot. Please choose another time.
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-body text-xs text-muted-foreground mb-3">
                    Available Tables ({availableTables.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTables.map((tableNo) => (
                      <div
                        key={tableNo}
                        className="font-body text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-medium"
                      >
                        Table #{tableNo}
                      </div>
                    ))}
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground mt-2">
                    Table #{tableRange.min} - #{tableRange.max} suitable for {guestsCount} guests
                  </p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="font-body text-sm font-medium mb-1.5 block">Special Requests</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              placeholder="Any dietary needs or special requests?"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold py-3 text-base transition-all"
            disabled={hasSlotSelection && availableTables.length === 0}
          >
            Confirm Reservation
          </Button>
        </form>
      </div>

      {/* Success Popup Overlay */}
      {successPopup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="relative bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <button
              onClick={() => {
                setSuccessPopup({ show: false, bookingId: "", tableNumber: undefined });
                navigate("/profile/reservations");
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="flex justify-center gap-1 mb-3">
              <Sparkles className="w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <Sparkles className="w-4 h-4 text-yellow-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <Sparkles className="w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Table Reserved Successfully!
            </h2>
            <p className="font-body text-muted-foreground mb-4">
              Your reservation has been confirmed. We look forward to hosting you!
            </p>

            <div className="bg-muted/50 rounded-xl px-4 py-3 mb-5">
              <p className="font-body text-xs text-muted-foreground">Booking ID</p>
              <p className="font-body font-bold text-primary text-lg">{successPopup.bookingId}</p>
              {successPopup.tableNumber && (
                <p className="font-body text-sm mt-1">
                  Assigned Table: <span className="font-bold text-primary">#{successPopup.tableNumber}</span>
                </p>
              )}
            </div>

            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full" style={{ animation: "shrink 3s linear forwards" }} />
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2">Redirecting to your reservations...</p>
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

export default ReservationPage;
