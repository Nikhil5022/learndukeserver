
import crypto from "crypto";
import { instance } from "../server.js";
import { User } from "../schema.js";
export const checkout = async (req, res) => {
    const options = {
      amount: Number(req.body.amount * 100),
      currency: "INR",
    receipt: `R-ABCS+${new Date().getDate()}-${new Date().getMonth()}-${new Date().getFullYear()}`,
  };

  const order = await instance.orders.create(options);

  await res.status(200).json({
    success: true,
    order,
  });
};

export const paymentVerification = async (req, res) => {

  try{

    const {
      razorpay_order_id,
      razorpay_payment_id,
    razorpay_signature,
  } = req.body;
    
  const user = await User.findOne({ email: req.params.id });
  
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  
  const expectedSign = crypto
  .createHmac("sha256", process.env.RZP_KEY_SECRET)
  .update(sign.toString())
  .digest("hex");
  
  // check both signs
  const isAuthentic = expectedSign === razorpay_signature;

  if (isAuthentic) {
    // Database comes here
    // await Payment.create({
      //   razorpay_order_id,
      //   razorpay_payment_id,
      //   razorpay_signature,
      // });
      user.isPremium = true;
      await user.save();
      res.redirect(
        `http://localhost:5173/paymentsuccess`
      );
    } else{
      res.redirect("http://localhost:5173/paymentfailed")
    }
  } catch (e) {
    res.redirect("http://localhost:5173/paymentfailed")
  }
}

export const sendKey = async (req, res) => {
  res.status(200).json({
    key: process.env.RZP_KEY_ID,
  });
};
