import { Router } from "express";
import {
  checkout,
  paymentVerification,
  sendKey,
} from "../controllers/paymentController.js";

const router = Router();

router.route("/checkout").post(checkout);
router.route("/verify/payment").post(paymentVerification);
router.route("/getkey").get(sendKey);

export default router;
