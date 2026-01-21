import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const refreshToken = user.generateRefreshToken();
        const accessToken = user.generateAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        console.log(error);
        throw new ApiError(
            500,
            `Somthing went wrong while generating tokens.`,
            error
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;

    if ([fullName, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        email,
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const user = await User.create({
        fullName,
        email,
        password,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if ([email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        email,
    });

    if (!existedUser) {
        throw new ApiError(404, "User not found with this email");
    }
    if (existedUser.isVerified === false) {
        throw new ApiError(409, "User not verified.");
    }

    const isPasswordCorrect = await existedUser.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid User Credentials.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existedUser._id
    );

    const loggedInUser = await User.findById(existedUser._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    refreshToken,
                    accessToken,
                },
                "User Logged In Successfully."
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: {
            //     refreshToken: undefined,
            // },
            $unset: {
                // this resets the refreshToken
                refreshToken: 1,
            },
        },
        {
            // this make return the new updates value
            new: true,
        }
    );

    return res
        .status(200)
        .clearCookie("refreshToken")
        .clearCookie("accessToken")
        .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        };

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: refreshToken,
                    },
                    "Access Token Refreshed"
                )
            );
    } catch (error) {
        console.log(error);
        throw new ApiError(401, "Unautorized Request.");
    }
});

const UserMe = asyncHandler(async (req, res) => {
    try {
        return res
            .status(200)
            .json(
                new ApiResponse(200, req?.user, "User Logged In Successfully.")
            );
    } catch (error) {
        console.log(error);
        throw new ApiError(
            500,
            `Somthing went wrong while checking the session tokens.`,
            error
        );
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, UserMe };
