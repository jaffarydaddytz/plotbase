import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'



//protect

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

           console.log("header:", authHeader);


    try {
        let token;

        if (
            req.headers.authorization
            &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token){
            return res.status(401).json({
                success: false,
                message: "not authorized, token missing"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = await User.findById(decoded.id).select("-password");


              console.log("REQ USER FULL:", req.user);
        console.log("REQ USER ROLE:", req.user?.role);

        if(req.user && req.user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "your account has been blocked by admin"
            })
        }

        next();
        
    } catch (err) {

        res.status(401).json({
            success: false,
            message: "token invalid"
        })
        
    }
}


//role based authentication
export const authorize = (...roles) => {
    return (req, res, next) => {




        const userRole = req.user?.role?.trim().toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());

                console.log("Authorize middleware hit");
console.log("req.user:", req.user);
console.log("userRole:", JSON.stringify(userRole));
console.log("allowedRoles:", JSON.stringify(allowedRoles));

        console.log("ROLE CHECK:", userRole);
        console.log("ALLOWED:", allowedRoles);

        if (!req.user || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "access denied, you dont have permission"
            });
        }

        next();
    };
};