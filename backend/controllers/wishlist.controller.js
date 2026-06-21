import Wishlist from "../models/wishlist.model.js"

//to add property to wishlist
export const addWishlist = async (req,res) => {
    try {
        const propertyId = req.params.propertyId;

       const existing = await Wishlist.findOne({
        user: req.user._id,
        property: propertyId
       });

       if(existing) {
        return res.status(200).json({
            success: true,
            message: "Already in wishlist"

        })
       }

       await Wishlist.create({
         user: req.user._id,
        property: propertyId
       })

       res.status(201).json({
        success: true,
        message: "Added to wishlist"
       })



    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        
    }
    
}


// to get the property that is in wishlist

export const getWishlist = async (req, res) => {
    try {
        const data = await Wishlist.find({
            user: req.user._id,
        }).populate("property")

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        
    }
    
}

//to remove a property from wishlist
export const removeWishlist = async (req, res) => {
    try {
        const propertyId =req.params.propertyId;
        const result = await Wishlist.findOneAndDelete({
            user: req.user._id,
            property: propertyId
        });

        if(!result){
            return res.status(404).json({
                success: false,
                message: "Wishlist not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "removed from wishlist"
        })
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        
    }
    
}