import mongoose from 'mongoose'
import { tableReservationStatus, tableReservationStatusEnums } from '../utils/constants.js';

const resevationSchema = new mongoose.Schema(
  {
    name : {
      type : String,
      require : true,
      trim : true
    },
    reservationUserEmail : {
        type : String,
        required: true,
        lowercase : true,
         match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email format is incorrect. Use a valid format such as name@example.com (e.g., janesmith@gmail.com) .']
    },
    reservationUserId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    phoneNumber : {
      type : String,
      required : true
    },
    noOfGuests : {
      type : Number ,
      required : true
    },
    startTime : {
      type : String,
      required : true
    },
    tableNo : {
      type : Number,
      required : true
    },
    endTime : {
      type : String,
      required : true
    },
    SpecialRequests : {
      type : String,
      default : ""
    },
    date : {
      type : Date,
      required: true
    },
    tableReservationStatus : {
      type : String,
      enum : tableReservationStatusEnums,
      default : tableReservationStatus.PENDING
    }
   }, { timestamps : true }
)

 resevationSchema.index({ tableNo: 1, date: 1 });

const Reservation = mongoose.model("Reservation", resevationSchema)
export default Reservation;
