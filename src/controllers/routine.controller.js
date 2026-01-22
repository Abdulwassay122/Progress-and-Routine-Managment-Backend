import mongoose from "mongoose";
import { Routine } from "../models/routine.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Progress } from "../models/progress.model.js";

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
            throw new ApiError(400, `Task title is required at index ${index}`);
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

const getAllRoutines = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routines = await Routine.aggregate([
        // ======================
        // 1. MATCH USER
        // ======================
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
            },
        },

        // ======================
        // 2. LOOKUP TASKS
        // ======================
        {
            $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "routineId",
                as: "tasks",
            },
        },

        // ======================
        // 3. LOOKUP PROGRESS
        // ======================
        {
            $lookup: {
                from: "progresses",
                localField: "_id",
                foreignField: "routineId",
                as: "progress",
            },
        },

        // ======================
        // 4. ADD COMPUTED FIELDS
        // ======================
        {
            $addFields: {
                totalTasks: { $size: "$tasks" },

                // distinct progress days
                daysFollowed: {
                    $size: {
                        $setUnion: ["$progress.date", []],
                    },
                },

                routineStartDate: {
                    $dateTrunc: {
                        date: "$createdAt",
                        unit: "day",
                    },
                },

                routineEndDate: {
                    $dateAdd: {
                        startDate: {
                            $dateTrunc: {
                                date: "$createdAt",
                                unit: "day",
                            },
                        },
                        unit: "day",
                        amount: { $subtract: ["$durationInDays", 1] },
                    },
                },

                totalProgressEntries: { $size: "$progress" },
            },
        },

        // ======================
        // 5. DAYS PASSED / REMAINING
        // ======================
        {
            $addFields: {
                daysPassed: {
                    $cond: [
                        { $gt: [today, "$routineStartDate"] },
                        {
                            $min: [
                                "$durationInDays",
                                {
                                    $add: [
                                        {
                                            $dateDiff: {
                                                startDate: "$routineStartDate",
                                                endDate: today,
                                                unit: "day",
                                            },
                                        },
                                        1,
                                    ],
                                },
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        {
            $addFields: {
                daysRemaining: {
                    $max: [
                        { $subtract: ["$durationInDays", "$daysPassed"] },
                        0,
                    ],
                },
            },
        },

        // ======================
        // 6. PROGRESS PERCENTAGE
        // ======================
        {
            $addFields: {
                progressPercentage: {
                    $cond: [
                        {
                            $and: [
                                { $gt: ["$totalTasks", 0] },
                                { $gt: ["$durationInDays", 0] },
                            ],
                        },
                        {
                            $round: [
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                "$totalProgressEntries",
                                                {
                                                    $multiply: [
                                                        "$totalTasks",
                                                        "$durationInDays",
                                                    ],
                                                },
                                            ],
                                        },
                                        100,
                                    ],
                                },
                                0,
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        // ======================
        // 7. FINAL PROJECTION
        // ======================
        {
            $project: {
                tasks: 0,
                progress: 0,
                routineStartDate: 0,
                routineEndDate: 0,
                totalProgressEntries: 0,
                daysPassed: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, routines, "Routines fetched successfully"));
});

const getActiveRoutine = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Routine.aggregate([
        // ======================
        // 1. ACTIVE ROUTINE
        // ======================
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                isActive: true,
            },
        },

        // ======================
        // 2. LOOKUP TASKS
        // ======================
        {
            $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "routineId",
                as: "tasks",
            },
        },

        // ======================
        // 3. LOOKUP PROGRESS
        // ======================
        {
            $lookup: {
                from: "progresses",
                localField: "_id",
                foreignField: "routineId",
                as: "progress",
            },
        },

        // ======================
        // 4. ROUTINE STATS
        // ======================
        {
            $addFields: {
                totalTasks: { $size: "$tasks" },

                daysFollowed: {
                    $size: {
                        $setUnion: ["$progress.date", []],
                    },
                },

                routineStartDate: {
                    $dateTrunc: {
                        date: "$createdAt",
                        unit: "day",
                    },
                },

                totalProgressEntries: { $size: "$progress" },
            },
        },

        {
            $addFields: {
                daysPassed: {
                    $min: [
                        "$durationInDays",
                        {
                            $add: [
                                {
                                    $dateDiff: {
                                        startDate: "$routineStartDate",
                                        endDate: today,
                                        unit: "day",
                                    },
                                },
                                1,
                            ],
                        },
                    ],
                },
            },
        },

        {
            $addFields: {
                daysRemaining: {
                    $max: [
                        { $subtract: ["$durationInDays", "$daysPassed"] },
                        0,
                    ],
                },

                progressPercentage: {
                    $cond: [
                        {
                            $and: [
                                { $gt: ["$totalTasks", 0] },
                                { $gt: ["$durationInDays", 0] },
                            ],
                        },
                        {
                            $round: [
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                "$totalProgressEntries",
                                                {
                                                    $multiply: [
                                                        "$totalTasks",
                                                        "$durationInDays",
                                                    ],
                                                },
                                            ],
                                        },
                                        100,
                                    ],
                                },
                                0,
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        // ======================
        // 5. TASK-WISE PROGRESS
        // ======================
        {
            $addFields: {
                tasks: {
                    $map: {
                        input: "$tasks",
                        as: "task",
                        in: {
                            taskId: "$$task._id",
                            title: "$$task.title",
                            description: "$$task.description",
                            priority: "$$task.priority",

                            totalProgress: {
                                $size: {
                                    $filter: {
                                        input: "$progress",
                                        as: "p",
                                        cond: {
                                            $eq: ["$$p.taskId", "$$task._id"],
                                        },
                                    },
                                },
                            },

                            progress: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$progress",
                                            as: "p",
                                            cond: {
                                                $eq: [
                                                    "$$p.taskId",
                                                    "$$task._id",
                                                ],
                                            },
                                        },
                                    },
                                    as: "tp",
                                    in: {
                                        date: "$$tp.date",
                                        completed: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        // ======================
        // 6. FINAL SHAPE
        // ======================
        {
            $project: {
                progress: 0,
                routineStartDate: 0,
                totalProgressEntries: 0,
                daysPassed: 0,
            },
        },
    ]);

    if (!result.length) {
        return res
            .status(200)
            .json(new ApiResponse(200, null, "No active routine found"));
    }

    const routine = result[0];

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                routine: {
                    userId: routine.userId,
                    routineId: routine._id,
                    name: routine.name,
                    description: routine.description,
                    isActive: routine.isActive,
                    durationInDays: routine.durationInDays,
                    totalTasks: routine.totalTasks,
                    progressPercentage: routine.progressPercentage,
                    daysFollowed: routine.daysFollowed,
                    daysRemaining: routine.daysRemaining,
                },
                tasks: routine.tasks,
            },
            "Active routine fetched successfully"
        )
    );
});

const deleteRoutineWithTasks = asyncHandler(async (req, res) => {
    const { routineId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (!routineId) {
        throw new ApiError(400, "Routine ID is required");
    }

    // ======================
    // 1. FIND ROUTINE
    // ======================
    const routine = await Routine.findOne({ _id: routineId, userId });

    if (!routine) {
        throw new ApiError(404, "Routine not found");
    }

    // ======================
    // 2. DELETE TASKS
    // ======================
    await Task.deleteMany({ routineId: routine._id, userId });

    // ======================
    // 3. DELETE PROGRESS OF THOSE TASKS
    // ======================
    await Progress.deleteMany({ routineId: routine._id, userId });

    // ======================
    // 4. DELETE ROUTINE
    // ======================
    await routine.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Routine and all associated tasks & progress deleted successfully"
            )
        );
});

export {
    createRoutineWithTasks,
    getAllRoutines,
    getActiveRoutine,
    deleteRoutineWithTasks,
};
