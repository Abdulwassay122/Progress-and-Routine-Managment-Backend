import { Router } from "express";
import {
    sendVerificationEmail,
    verifyOTP,
} from "../controllers/verification.controller.js";

const router = Router();

router.route("/sendemail").post(sendVerificationEmail);
router.route("/").post(verifyOTP);

export default router;
