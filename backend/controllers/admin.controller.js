import User from "../models/user.model.js";
import Property from "../models/property.model.js";
import Inquiry from "../models/inquiry.model.js";

//view all users

export const getAllUsers = async(req, res) =>{
    try {
        const users = await User.find().select("-password")
        res.json({
            success: true,
            count:users.length,
            users
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
    }
}


//block a user
export const blockUser = async(req, res)=>{
    try {
        const user= await User.findById(req.params.id);
        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({
            success: true,
            message: user.isBlocked ? "user blocked" : "user unblocked",
            isBlocked: user.isBlocked
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
    }

}

// to delete a user
export const deleteUser = async (req, res) =>{
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: "user deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
    }
}

//view all properties
export const getAllProperties = async (req, res)=>{
    try {
        const properties = await Property.find().populate("seller", "name email");
        res.json({
            success: true,
            count: properties.length,
            properties
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
    }
}

//to delete property

export const deleteProperty = async (req, res) =>{
    console.log("this end point was hit")
    try {
        await Property.findByIdAndDelete(req.params.id)
        res.json({
            success: true,
            message: "property deleted"
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
    }
}


    // dashboard analytics
export const getDashboardStats = async (req, res)=>{
    try {
       const totalUsers = await User.countDocuments();
       const totalProperties = await Property.countDocuments(); 

       const activeListings = await Property.countDocuments({
        status:"sale"
       })

       const soldProperties = await Property.countDocuments({
        status:"sold"
       })

       res.json({
        success: true,
        stats:{
            totalUsers,
            totalProperties,
            activeListings,
            soldProperties
        }
       })




    } catch (error) {
        res.status(500).json({
            message:error.message
        })
        
        
    }

}


// to get pending seller account
export const getPendingSellers = async(req, res) =>{
    try {
        const pendingSellers = await User.find({
            role: "seller",
            isApproved: false
        }).select("-password");

        res.json({
            success: true,
            count: pendingSellers.length,
            pendingSellers
        })
    } catch (error) {
         res.status(500).json({
            message:error.message
        })
        
    }
}



// to  approve a seller
export const approveSeller = async (req, res) => {
    try {
        const seller = await User.findById(req.params.id);
        if(!seller || seller.role !== "seller"){
            return res.status(404).json({
                success: false,
                message: "you are not a seller"
            });
        }

        seller.isApproved = true;
        await seller.save();

        res.json({
            success: true,
            message: "seller approved successfully",
            seller
        })
    } catch (error) {

         res.status(500).json({
            message:error.message
        })
        
    }
}