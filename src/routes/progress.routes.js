import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addTaskProgress } from "../controllers/progress.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addTaskProgress);

export default router;