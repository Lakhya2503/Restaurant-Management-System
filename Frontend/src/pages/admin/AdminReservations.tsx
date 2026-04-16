import { useState, useEffect } from "react";
import { useOrders } from "@/context/OrderContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, CheckCircle2, CalendarDays, Clock, X, Package, Sparkles } from "lucide-react";
import type { Reservation } from "@/context/OrderContext";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-200 text-yellow-800",
  confirmed: "bg-primary/20 text-primary",
  cancelled: "bg-destructive/20 text-destructive",
  completed: "bg-green-200 text-green-800",
};

const to12hr = (time24: string) => {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

const guestBuckets = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const total = timeToMinutes(time) + minutesToAdd;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const intervalsOverlap = (startA: string, endA: string, startB: string, endB: string) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
};

const getCurrentClosestSlot = () => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = timeSlots.find((slot) => timeToMinutes(slot) >= nowMinutes);
  return upcoming || timeSlots[timeSlots.length - 1];
};

const AdminReservations = () => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(getCurrentClosestSlot());
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({ Pending: 0, Confirm: 0, Completed: 0, Cancelled: 0 });
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [selectedGuestBucket, setSelectedGuestBucket] = useState("1");

  const { reservations: allReservations, updateReservationStatus, getTableRangeForGuests, getReservationSummary } = useOrders();

  const fetchSummary = async () => {
    const data = await getReservationSummary();
    setSummary(data);
  };

  useEffect(() => {
    fetchSummary();
  }, [allReservations]);

  const openConfirmationEmail = (reservation: Reservation) => {
    if (!reservation.email) {
      toast.error("Customer email not available for this reservation");
      return;
    }

    const startTime = reservation.startTime || reservation.time;
    const endTime = reservation.endTime || addMinutesToTime(startTime, 60);
    const subject = encodeURIComponent(`Reservation Confirmed - ${reservation.id}`);
    const tableText = reservation.assignedTable ? `Table #${reservation.assignedTable}` : "a table assigned on arrival";
    const body = encodeURIComponent(
      `Hi ${reservation.name},\n\n` +
        `Your reservation is confirmed.\n` +
        `Booking ID: ${reservation.id}\n` +
        `Date: ${reservation.date}\n` +
        `Time: ${to12hr(startTime)} - ${to12hr(endTime)}\n` +
        `Guests: ${reservation.guests}\n` +
        `Table: ${tableText}\n\n` +
        `Thank you for choosing Athenura. We look forward to hosting you.\n`
    );

    window.open(`mailto:${reservation.email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`Email draft opened for ${reservation.email}`);
  };

  useEffect(() => {
    setReservations(allReservations);
  }, [allReservations]);

  useEffect(() => {
    if (!availabilityDate) {
      setAvailabilityDate(new Date().toISOString().split("T")[0]);
    }
  }, [availabilityDate]);

  useEffect(() => {
    setSelectedTableNumber(null);
  }, [availabilityDate, selectedTimeSlot, selectedGuestBucket]);

  const updateStatus = async (id: string, status: Reservation["status"]) => {
    const targetReservation = reservations.find((reservation) => reservation.id === id);
    const wasConfirmed = targetReservation?.status === "confirmed";

    await updateReservationStatus(id, status);
    setReservations(allReservations);

    if (status === "confirmed" && !wasConfirmed && targetReservation) {
      openConfirmationEmail({ ...targetReservation, status });
    }
  };

  const guestCount = parseInt(selectedGuestBucket, 10);
  const tableRange = getTableRangeForGuests(guestCount);
  const bucketTables = Array.from({ length: tableRange.end - tableRange.start + 1 }, (_, index) => tableRange.start + index);

  const getReservationsForSlot = (slot: string, guestFilter: number) =>
    reservations.filter((reservation) => {
      const start = reservation.startTime || reservation.time;
      const end = reservation.endTime || addMinutesToTime(start, 60);

      return (
        reservation.date === availabilityDate &&
        reservation.guests === guestFilter &&
        reservation.status !== "cancelled" &&
        intervalsOverlap(start, end, slot, addMinutesToTime(slot, 60))
      );
    });

  const selectedSlotReservations = availabilityDate ? getReservationsForSlot(selectedTimeSlot, guestCount) : [];
  const bookedTables = selectedSlotReservations
    .filter((reservation) => reservation.assignedTable !== undefined)
    .map((reservation) => reservation.assignedTable as number)
    .filter((tableNo) => tableNo >= tableRange.start && tableNo <= tableRange.end)
    .sort((a, b) => a - b);

  const availableTables = bucketTables.filter((tableNo) => !bookedTables.includes(tableNo));

  const selectedTableReservation =
    selectedTableNumber === null
      ? null
      : selectedSlotReservations.find((reservation) => reservation.assignedTable === selectedTableNumber) || null;

  const slotSummaries = timeSlots.map((slot) => {
    const slotReservations = availabilityDate ? getReservationsForSlot(slot, guestCount) : [];
    const bookedSet = new Set(
      slotReservations
        .filter((reservation) => reservation.assignedTable !== undefined)
        .map((reservation) => reservation.assignedTable as number)
        .filter((tableNo) => tableNo >= tableRange.start && tableNo <= tableRange.end)
    );

    return {
      slot,
      bookings: slotReservations.length,
      bookedTables: bookedSet.size,
      availableTables: bucketTables.length - bookedSet.size,
    };
  });

  const isToday = availabilityDate === new Date().toISOString().split("T")[0];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const upcomingSlotSummaries = slotSummaries.filter((slotInfo) => !isToday || timeToMinutes(slotInfo.slot) >= nowMinutes);

  const filteredReservations = reservations.filter(r =>
    filterStatus === "all" || r.status === filterStatus
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Reservations</h1>
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg font-body text-xs capitalize transition-all ${
                filterStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: summary.Pending, color: "text-yellow-600 bg-yellow-100" },
          { label: "Confirmed", count: summary.Confirm, color: "text-primary bg-primary/10" },
          { label: "Completed", count: summary.Completed, color: "text-green-700 bg-green-100" },
          { label: "Cancelled", count: summary.Cancelled, color: "text-destructive bg-destructive/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover-lift">
            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <div className="flex items-end justify-between mt-1">
              <h3 className="font-display text-2xl font-bold">{c.count}</h3>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${c.color}`}>{c.label[0]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["ID", "Guest", "Phone", "Guests", "Date", "Time", "Notes", "Status", "Table #", "Actions"].map((h) => (
                  <th key={h} className="text-left font-body text-xs font-semibold text-muted-foreground p-3">{h}</th>
                ))}
               </tr>
            </thead>
            <tbody>
              {filteredReservations.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="font-body text-sm p-3 font-medium">{r.id}</td>
                  <td className="font-body text-sm p-3">{r.name}</td>
                  <td className="font-body text-xs p-3 text-muted-foreground">{r.phone}</td>
                  <td className="font-body text-sm p-3 text-center">{r.guests}</td>
                  <td className="font-body text-sm p-3">{r.date}</td>
                  <td className="font-body text-sm p-3">{to12hr(r.startTime || r.time)} - {to12hr(r.endTime || addMinutesToTime(r.startTime || r.time, 60))}</td>
                  <td className="font-body text-xs p-3 text-muted-foreground max-w-[150px] truncate">{r.notes || "-"}</td>
                  <td className="p-3"><span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${statusColor[r.status]}`}>{r.status}</span></td>
                  <td className="p-3">
                    <span className="font-body text-sm font-semibold text-primary">
                      {r.assignedTable ? `#${r.assignedTable}` : "Auto-assigned on confirmation"}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as Reservation["status"])}
                      className="font-body text-xs border border-border rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-5 mb-4">
          <div className="flex-1">
            <p className="font-body text-xs uppercase tracking-wider text-primary mb-1">Table Availability</p>
            <h2 className="font-display text-xl font-bold">Guest-Wise Upcoming Slot Board</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Date</label>
              <input
                type="date"
                value={availabilityDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Guests</label>
              <select
                value={selectedGuestBucket}
                onChange={(e) => setSelectedGuestBucket(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {guestBuckets.map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          {!availabilityDate ? (
            <p className="font-body text-sm text-muted-foreground">Select date to view board.</p>
          ) : (
            <>
              <p className="font-body text-sm font-medium mb-2">
                {guestCount} {guestCount === 1 ? "Person" : "People"} Table Range: #{tableRange.start} to #{tableRange.end}
              </p>
              <p className="font-body text-sm font-medium mb-3">Upcoming Time Slots</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
                {(upcomingSlotSummaries.length > 0 ? upcomingSlotSummaries : slotSummaries).map((slotInfo) => {
                  const isActive = slotInfo.slot === selectedTimeSlot;
                  return (
                    <button
                      key={slotInfo.slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slotInfo.slot)}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <p className="font-body text-sm font-semibold">{to12hr(slotInfo.slot)}</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">Reservations: {slotInfo.bookings}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="font-body text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          Booked: {slotInfo.bookedTables}
                        </span>
                        <span className="font-body text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Free: {slotInfo.availableTables}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="font-body text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Selected Slot: {to12hr(selectedTimeSlot)}
                </span>
                <span className="font-body text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                  Available Tables: {availableTables.length}
                </span>
                <span className="font-body text-xs px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  Booked Tables: {bookedTables.length}
                </span>
                <span className="font-body text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  Total Tables: {bucketTables.length}
                </span>
              </div>

              <div className="pt-2 border-t border-border/60">
                <p className="font-body text-xs font-semibold text-foreground mb-2">Table Numbers (Click to view details)</p>
                <p className="font-body text-[11px] text-muted-foreground mb-2">Red = booked, Green = available</p>

                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                  {bucketTables.map((tableNo) => {
                    const isBooked = bookedTables.includes(tableNo);
                    const isSelected = selectedTableNumber === tableNo;
                    return (
                      <button
                        key={`slot-${tableNo}`}
                        type="button"
                        onClick={() => setSelectedTableNumber(tableNo)}
                        className={`font-body text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isBooked
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-primary/10 text-primary border-primary/25"
                        } ${isSelected ? "ring-2 ring-primary/40" : ""}`}
                      >
                        #{tableNo}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-border bg-background p-3">
                  <p className="font-body text-xs text-muted-foreground mb-2">Clicked Table Details</p>
                  {selectedTableNumber === null ? (
                    <p className="font-body text-sm text-muted-foreground">Select a table number to view details.</p>
                  ) : selectedTableReservation ? (
                    <div className="space-y-1.5">
                      <p className="font-body text-sm font-semibold text-foreground">
                        Table #{selectedTableNumber} is booked by {selectedTableReservation.name}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        Time: {to12hr(selectedTableReservation.startTime || selectedTableReservation.time)} - {to12hr(selectedTableReservation.endTime || addMinutesToTime(selectedTableReservation.startTime || selectedTableReservation.time, 60))}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">Phone: {selectedTableReservation.phone}</p>
                      <p className="font-body text-xs text-muted-foreground">Guests: {selectedTableReservation.guests}</p>
                      <p className="font-body text-xs text-muted-foreground">Booking ID: {selectedTableReservation.id}</p>
                      <p className="font-body text-xs text-muted-foreground">Status: {selectedTableReservation.status}</p>
                      {selectedTableReservation.notes ? (
                        <p className="font-body text-xs text-muted-foreground">
                          Note: <span className="italic">{selectedTableReservation.notes}</span>
                        </p>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground">Note: -</p>
                      )}
                    </div>
                  ) : (
                    <p className="font-body text-sm text-primary">Table #{selectedTableNumber} is available in this selected slot.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReservations;
