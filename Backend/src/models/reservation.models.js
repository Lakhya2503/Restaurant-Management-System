import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    specialRequests: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Fixed indexes
reservationSchema.index({ userId: 1, createdAt: -1 });
reservationSchema.index({ userEmail: 1 });
reservationSchema.index({ tableId: 1 });

// Virtual for table details
reservationSchema.virtual('tableDetails', {
  ref: 'Table',
  localField: 'tableId',
  foreignField: '_id',
  justOne: true
});

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
