import { Progress } from "../models/progress.model.js";
import { Task } from "../models/task.model.js";
import { Routine } from "../models/routine.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addTaskProgress = asyncHandler(async (req, res) => {
    const { taskId } = req.body;
    const userId = req.user?._id;

    // ======================
    // 1. VALIDATIONS
    // ======================

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (!taskId) {
        throw new ApiError(400, "Task ID is required");
    }

    // Always use current date (server time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ======================
    // 2. FETCH TASK
    // ======================

    const task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    // ======================
    // 3. FETCH ROUTINE
    // ======================

    const routine = await Routine.findOne({
        _id: task.routineId,
        userId,
    });

    if (!routine) {
        throw new ApiError(404, "Routine not found");
    }

    // ======================
    // 4. CHECK ROUTINE DATE RANGE
    // ======================

    const routineStartDate = new Date(routine.createdAt);
    routineStartDate.setHours(0, 0, 0, 0);

    const routineEndDate = new Date(routineStartDate);
    routineEndDate.setDate(
        routineEndDate.getDate() + routine.durationInDays - 1
    );

    if (today < routineStartDate || today > routineEndDate) {
        throw new ApiError(
            400,
            "Routine has ended or not started yet"
        );
    }

    // ======================
    // 5. ONE PROGRESS PER DAY
    // ======================

    const existingProgress = await Progress.findOne({
        userId,
        taskId,
        date: today,
    });

    if (existingProgress) {
        throw new ApiError(
            409,
            "Progress for this task already added today"
        );
    }

    // ======================
    // 6. CREATE PROGRESS
    // ======================

    const progress = await Progress.create({
        userId,
        routineId: routine._id,
        taskId,
        date: today,
    });

    if (!progress) {
        throw new ApiError(500, "Failed to add task progress");
    }

    return res.status(201).json(
        new ApiResponse(201, progress, "Task progress added successfully")
    );
});

export { addTaskProgress };
