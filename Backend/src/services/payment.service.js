import Razorpay from "razorpay";
import { rozarPayKeyId, rozarPayKeySecret } from "../utils/config.js";

const razorpay = new Razorpay({
  key_id: rozarPayKeyId,
  key_secret: rozarPayKeySecret,
});

const paymentService = async (amount) => {
  try {
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };


    const order = await razorpay.orders.create(options);

    return order;
  } catch (error) {
    console.error("Razorpay Error:", error);
    throw error;
  }
};

export default paymentService;
