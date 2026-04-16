import mongoose from 'mongoose'
import { paymentType, paymentTypeEnums } from '../utils/constants.js';


const paymentSchema = new mongoose.Schema(
  {
    orderId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : "Order"
    },
      userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
      },
      typeOfPayment : {
          type : String,
          default : paymentType.ONLINE,
          enum : paymentTypeEnums
      },
      paymentAmount : {
        type : Number,
        required : true,
        default : null
      },
      paymentId : {
        type : String,
        default : undefined
      }
   }, {
    timestamps : true
   }  
)


const Payment = mongoose.model("Payment", paymentSchema)
export default Payment;
