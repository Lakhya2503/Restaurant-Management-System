import { model, Schema } from "mongoose";
import { tableReservationStatus, tableReservationStatusEnums } from "../utils/constants.js";

const tableSchema = new Schema(
  {
    tableNumber: {
      type: Number,
      required: [true, "Table number is required"],
    },
    numberOfGuest: {
      type: Number,
      required: [true, "Number of guests is required"],
    },
    date: {
      type: Date,
      required: [true, "Reservation date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
    },
    tableStatus: {
      type: String,
      enum: tableReservationStatusEnums,
      default: undefined,
    },
    startTimeInMinutes: {
      type: Number,
      required: [true, "Start time in minutes is required"],
    },
    endTimeInMinutes: {
      type: Number,
      required: [true, "End time in minutes is required"],
    },
  },
  { timestamps: true }
);


const Table = model("Table", tableSchema);
export default Table;
