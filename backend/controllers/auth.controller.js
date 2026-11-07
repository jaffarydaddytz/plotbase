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

    // Every new public user registers as an investor.
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "investor",
      isApproved: true,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000),
      verificationLastSentAt: new Date(),
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
    if (!email || !password) {
      return res.status(400).json({
        message: "email and password required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "invalid email or password",
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
// Get the currently authenticated user's safe profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select(
        "name email role phone address profilePic isVerified isApproved"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return only explicitly permitted fields
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        address: user.address || "",
        profilePic: user.profilePic || "",
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      },
    });

  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile",
    });
  }
};

//verify the email
export const verifyEmail = async (req, res) => {

  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "email and code are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "user not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "email already verified",
      });
    }

    // Reject expired or missing verification expiration
    if (
      !user.verificationTokenExpires ||
      user.verificationTokenExpires.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }



    const submittedCode = String(code).trim();

    if (
      !user.verificationToken ||
      !/^\d{6}$/.test(submittedCode) ||
      user.verificationToken !== submittedCode
    ) {
      return res.status(400).json({
        message: "invalid verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    res.status(200).json({
      message: "email verified successfully",
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false,
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

/* 
export const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(404).json({message: "no user found with that email"})
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetPasswordExpire = Date.now() + 15*60*1000;

        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpire = resetPasswordExpire;
        await user.save();

        const clientUrl = "http://localhost:5173";
        const resetUrl =  ` ${clientUrl}/reset-password/${resetToken} `,
        const message =   ` 
        <h2> Password Reset Request</h2>
        <p>  you requested a password reset. please click on the link below to reset your password</p>
        <a href="${resetUrl}" clicktracking ="off>${resetUrl} </a>
        <p> this link will expire in 15 minutes  </p>

        
         `
        

         
 try {
    await sendEmail({
        email: user.email,
        subject: "password reset - plotbase platform",
        message
    });
    res.status(200).json({message: "password reset email sent", success: true});


 } catch (error) {

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire= undefined;
    await user.save();
    return res.status(500).json({message: "could not send email", success:false})
    
 }










    } catch (err) {
        res.status(500).json({message: err.message, success: false});
        
    }
}; 
*/

//reset password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "invalid or invalid rest password", success: false });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undifined;

    await user.save();
    res.status(200).json({
      message: "password updated successfuly",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: err.message, success: false });
  }
};
