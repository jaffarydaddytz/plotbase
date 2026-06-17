import express from "express";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { approveSeller, blockUser, deleteUser, getAllProperties, getAllUsers, getDashboardStats, getPendingSellers } from "../controllers/admin.controller.js";
import { deleteProperty } from "../controllers/admin.controller.js";


const adminRouter = express.Router();


adminRouter.use(protect, authorize("admin"));

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/block", blockUser);

adminRouter.delete("/users/:id", deleteUser);
adminRouter.get("/properties", getAllProperties)



// adminRouter.delete("/properties/:id", deleteProperty)

adminRouter.delete("/properties/:id", (req, res, next) => {
  console.log("Route matched, before controller");
  next();
}, deleteProperty);



adminRouter.get("/stats/", getDashboardStats)

adminRouter.get("/pending-sellers", getPendingSellers);

adminRouter.patch("/approve-seller/:id", approveSeller)

export default adminRouter;