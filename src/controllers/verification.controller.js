import { User } from "../models/user.model.js";
import { OtpToken } from "../models/verify.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmial.js";
import bcrypt from "bcrypt";
import { generateAccessAndRefreshToken } from "./user.controller.js";

const sendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    const existingToken = await OtpToken.findOne({ email });

    if (!existingUser) {
        throw new ApiError(404, "User not Found with this email.");
    } else if (existingUser.isVerified === true) {
        throw new ApiError(404, "User already verified.");
    } else if (existingToken) {
        throw new ApiError(409, "Verification is Already Sent.");
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = await bcrypt.hash(otp, 11);

    const OtpRequest = new OtpToken({
        email: email,
        otpHash: hashedOtp,
    });

    const response = await OtpRequest.save();

    const sent = await sendEmail(email, otp);

    if (!sent) {
        throw new ApiError(409, "Failed to send email.");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, {}, "OTP sent successfully"));
});

const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const response = await OtpToken.findOne({ email });
    if (response === null) {
        throw new ApiError(404, "Your Token is expired. OR Incorrect Email");
    } else if (response.attempts >= 3) {
        throw new ApiError(
            403,
            "Maximum attempts reached. Try to Veifying Again."
        );
    }

    // increment attempts by 1 and return the updated document
    const increment = await OtpToken.findOneAndUpdate(
        { email },
        { $inc: { attempts: 1 } }, // increment attempts
        { new: true } // return updated doc
    );
    if (!increment) {
        throw new ApiError(404, "No OTP found for this email");
    }

    const comparision = await bcrypt.compare(otp, response.otpHash);
    if (!comparision) {
        throw new ApiError(400, "Invalid Otp.");
    } else if (comparision) {
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { $set: { isVerified: true } },
            { new: true, runValidators: false }
        );
        if (!updatedUser) {
            throw new ApiError(404, "User not found");
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(updatedUser._id);

        const loggedInUser = await User.findById(updatedUser._id).select(
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
                new ApiResponse(200, loggedInUser, "Verification Successful.")
            );
    }
});



export { sendVerificationEmail, verifyOTP };
