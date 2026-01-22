import { Router } from "express";
import { createRoutineWithTasks } from "../controllers/routine.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createRoutineWithTasks);

export default router;
