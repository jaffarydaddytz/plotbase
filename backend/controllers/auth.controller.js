import User from "../models/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

//register
// Register a new investor
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedName.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid name, email or password",
      });
    }

    // Check whether user already exists
    const userExists = await User.findOne({
      email: normalizedEmail,
    });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate secure email verification code
    const verificationToken = crypto
      .randomInt(100000, 1000000)
      .toString();

    // Public registration creates investors only
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "buyer",
      isApproved: true,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000),
      verificationLastSentAt: new Date()
    });

    // Send verification email
    try {
      await sendEmail({
        email: normalizedEmail,
        subject: "Verify your email - Plotbase Platform",
        message: `
          <h2>Welcome to Plotbase</h2>
          <p>Your email verification code is:</p>
          <h3>${verificationToken}</h3>
          <p>Enter this code to activate your account.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send verification email");
    }

    return res.status(201).json({
      success: true,
      message:
        "User registered. Please check your email for the verification code.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};


//login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate login credentials
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Normalize email before database lookup
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Reject nonexistent accounts
if (!user) {
  return res.status(400).json({
    success: false,
    message: "Invalid email or password",
  });
}

    // Verify password first
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "invalid email or password",
      });
    }

    // Check email verification after password validation
    if (!user.isVerified) {
      return res.status(403).json({
        message: "please verify your email or contact support",
        code: "EMAIL_VERIFY",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "your account has been blocked by and admin",
      });
    }

    //token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );



    // formating + selecting what to send back to the client
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isVerified: user.isVerified
    }



    res.json({
      message: "login success",
      token,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

//to get profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "user not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: err.message,
    });
  }
};

//verify the email
// Verify user email
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body ?? {};

    // Validate input
    if (
      typeof email !== "string" ||
      !email.trim() ||
      (typeof code !== "string" && typeof code !== "number")
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const submittedCode = String(code).trim();

    if (!/^\d{6}$/.test(submittedCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    const now = new Date();
    const MAX_ATTEMPTS = 5;

    // Conditions required for verification attempts
const eligibleUser = {
  email: normalizedEmail,
  isVerified: { $ne: true },
  isBlocked: { $ne: true },
  verificationTokenExpires: { $gt: now },

  $or: [
    { verificationAttempts: { $lt: MAX_ATTEMPTS } },
    { verificationAttempts: { $exists: false } },
  ],
};

    // Atomically verify a correct code
    const verifiedUser = await User.findOneAndUpdate(
      {
        ...eligibleUser,
        verificationToken: submittedCode,
      },
      {
        $set: {
          isVerified: true,
          verificationAttempts: 0,
        },
        $unset: {
          verificationToken: "",
          verificationTokenExpires: "",
        },
      },
      { new: true }
    );

    if (verifiedUser) {
      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    }

    // Atomically count incorrect verification attempts
    const failedAttempt = await User.updateOne(
      {
        ...eligibleUser,
        verificationToken: { $ne: submittedCode },
      },
      {
        $inc: {
          verificationAttempts: 1,
        },
      }
    );

    if (failedAttempt.modifiedCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Expired code, exhausted attempts, or ineligible account
    return res.status(400).json({
      success: false,
      message:
        "Verification failed. The code may have expired or the maximum attempts have been reached. Request a new code if needed.",
    });

  } catch (error) {
    console.error("Email verification failed");

    return res.status(500).json({
      success: false,
      message: "Unable to verify email",
    });
  }
};

// Resend email verification code
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const now = new Date();
    const cooldown = new Date(now.getTime() - 60 * 1000);

    // Generate a secure verification code
    const verificationToken = crypto.randomInt(100000, 1000000).toString();

    // Atomically enforce cooldown and update verification details
    const user = await User.findOneAndUpdate(
      {
        email: normalizedEmail,
        isVerified: false,
        isBlocked: false,
        $or: [
          { verificationLastSentAt: { $exists: false } },
          { verificationLastSentAt: null },
          { verificationLastSentAt: { $lte: cooldown } },
        ],
      },
      {
        $set: {
          verificationToken,
          verificationTokenExpires: new Date(now.getTime() + 10 * 60 * 1000),
          verificationAttempts: 0,
          verificationLastSentAt: now,
        },
      },
      { new: true }
    );

    // Use a generic response to prevent account enumeration
    const response = {
      success: true,
      message: "If verification is required, a new code will be sent.",
    };

    if (!user) {
      return res.status(200).json(response);
    }

    try {
      await sendEmail({
        email: user.email,
        subject: "New Verification Code - Plotbase",
        message: `
          <h2>Plotbase Email Verification</h2>
          <p>Your new verification code is:</p>
          <h3>${verificationToken}</h3>
          <p>This code expires in 10 minutes.</p>
        `,
      });
    } catch (emailError) {
      console.error("Verification email delivery failed");
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Resend verification request failed");

    return res.status(500).json({
      success: false,
      message: "Unable to process verification request",
    });
  }
};

//forgot password

// Request password reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body ?? {};

    // Validate email
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generic response prevents account enumeration
    const response = {
      success: true,
      message:
        "If an account exists, a password reset link will be sent.",
    };

    const user = await User.findOne({
      email: normalizedEmail,
      isBlocked: { $ne: true },
    });

    if (!user) {
      return res.status(200).json(response);
    }

    // Generate a cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the token hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    // Frontend URL must be configured in the environment
    const clientUrl = process.env.CLIENT_URL;

    if (!clientUrl) {
      console.error("CLIENT_URL is not configured");

      await User.updateOne(
        {
          _id: user._id,
          resetPasswordToken: hashedToken,
        },
        {
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
          },
        }
      );

      return res.status(500).json({
        success: false,
        message: "Password recovery is temporarily unavailable",
      });
    }

    const resetUrl = new URL(
      `/reset-password/${resetToken}`,
      clientUrl
    ).toString();

    // Send reset email
    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Your Password - Plotbase",
        message: `
          <h2>Plotbase Password Reset</h2>

          <p>You requested a password reset.</p>

          <p>
            <a href="${resetUrl}">Reset Password</a>
          </p>

          <p>This link expires in 15 minutes.</p>

          <p>If you did not request this, ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error("Password reset email delivery failed");

      // Clear only the token issued by this request
      await User.updateOne(
        {
          _id: user._id,
          resetPasswordToken: hashedToken,
        },
        {
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
          },
        }
      );
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Password reset request failed");

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request",
    });
  }
};


//reset password
// Reset password using a valid, unexpired token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body ?? {};

    // Validate the reset token
    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Apply the same password requirements as registration
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters and must not exceed 72 bytes",
      });
    }

    // Hash the submitted reset token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atomically update password and invalidate the reset token
    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
        isBlocked: { $ne: true },
      },
      {
        $set: {
          password: hashedPassword,
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      },
      {
        new: false,
      }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error("Password reset failed");

    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
};
