import mongoose from "mongoose";

const routineSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: false,
        },

        durationInDays: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

routineSchema.index(
    { userId: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
    }
);


export const Routine = mongoose.model("Routine", routineSchema);
