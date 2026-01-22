import { Routine } from "../models/routine.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createRoutineWithTasks = asyncHandler(async (req, res) => {
    const { name, description, durationInDays, isActive, tasks } = req.body;
    const userId = req.user?._id;

    // ======================
    // 1. VALIDATIONS FIRST
    // ======================

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (!name?.trim()) {
        throw new ApiError(400, "Routine name is required");
    }

    if (!durationInDays || durationInDays < 1) {
        throw new ApiError(400, "Duration must be at least 1 day");
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new ApiError(400, "At least one task is required");
    }

    tasks.forEach((task, index) => {
        if (!task.title?.trim()) {
            throw new ApiError(
                400,
                `Task title is required at index ${index}`
            );
        }

        if (
            task.priority &&
            !["Low", "Medium", "High"].includes(task.priority)
        ) {
            throw new ApiError(
                400,
                `Invalid priority for task at index ${index}`
            );
        }
    });

    // ======================================
    // 2. HANDLE ACTIVE ROUTINE CONSTRAINT
    // ======================================

    if (isActive === true) {
        await Routine.updateMany(
            { userId, isActive: true },
            { $set: { isActive: false } }
        );
    }

    // ======================
    // 3. CREATE ROUTINE
    // ======================

    const routine = await Routine.create({
        userId,
        name,
        description,
        durationInDays,
        isActive: isActive ?? false,
    });

    if (!routine) {
        throw new ApiError(500, "Failed to create routine");
    }

    // ======================
    // 4. CREATE TASKS
    // ======================

    const taskDocs = tasks.map((task) => ({
        userId,
        routineId: routine._id,
        title: task.title,
        description: task.description,
        priority: task.priority || "Medium",
    }));

    const createdTasks = await Task.insertMany(taskDocs);

    // ======================
    // 5. RESPONSE
    // ======================

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                routine,
                tasks: createdTasks,
            },
            "Routine and tasks created successfully"
        )
    );
});

export { createRoutineWithTasks };