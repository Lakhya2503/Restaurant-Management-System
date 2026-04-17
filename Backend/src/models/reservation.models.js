import mongoose from "mongoose";
import {
  tableReservationStatus,
  tableReservationStatusEnums,
} from "../utils/constants.js";

const reservationSchema = new mongoose.Schema(
  {
    // USER INFO
    name: {
      type: String,
      required: true,
      trim: true,
    },

    reservationUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reservationEmail: {
      type: String,
      required: true,
      trim: true,
      index: true, // ❌ NOT unique (important)
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    noOfGuests: {
      type: Number,
      required: true,
    },

    specialRequests: {
      type: String,
      default: "",
    },

    // TABLE INFO
    tableNo: {
      type: Number,
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    startTimeInMinutes: {
      type: Number,
      required: true,
      index: true,
    },

    endTimeInMinutes: {
      type: Number,
      required: true,
      index: true,
    },

    tableReservationStatus: {
      type: String,
      enum: tableReservationStatusEnums,
      default: tableReservationStatus.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

// SAFE INDEXES (NO UNIQUE INDEX ANYWHERE)
reservationSchema.index({ tableNo: 1, date: 1 });

reservationSchema.index({
  tableNo: 1,
  date: 1,
  startTimeInMinutes: 1,
  endTimeInMinutes: 1,
});

reservationSchema.index({ reservationUserId: 1, date: -1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
