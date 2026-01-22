import { Router } from "express";
import {
    createRoutineWithTasks,
    deleteRoutineWithTasks,
    getActiveRoutine,
    getAllRoutines,
} from "../controllers/routine.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createRoutineWithTasks);
router.route("/").get(getAllRoutines);
router.route("/active").get(getActiveRoutine);
router.route("/:routineId").delete(deleteRoutineWithTasks);

export default router;
