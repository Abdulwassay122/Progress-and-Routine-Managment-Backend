import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        routineId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Routine",
        },

        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Progress = mongoose.model("Progress", progressSchema);
