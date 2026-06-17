import User from "../models/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

//register
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "user already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isApproved: role === "seller" ? false : true,
      verificationToken,
    });

    try {
      await sendEmail({
        email,
        subject: "Verify your email - Plotbase Platform",
        message: `<p> Your email verification code is <strong> ${verificationToken} </strong></p> <p> Please enter this code on the verification page to activate your account</p>`,
      });
    } catch (emailError) {
      console.error("failed to send verification email", emailError);
      //we still create the user
    }

    res.status(201).json({
      message:
        "user registered . Please check your email fo the verification code",
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "please verify your email or contact support",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "invalid email or password",
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

    res.json({
      message: "login success",
      token,
      user,
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
export const verifyEmail = async (req, res) => {
  console.log("verify email", req.body)
 

  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "email and code are required" });
    }

    const user = await User.findOne({ email });
     console.log("DB code:", user.verificationToken, "Provided code:", code);

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

    if (String(user.verificationToken) !== String(code)) {
      return res.status(400).json({
        message: "invalid code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
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
