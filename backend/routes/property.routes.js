import express from 'express';
import { addProperty, deleteProperty, getAllProperties, getMyProperties, getPropertyCounts, getPropertyDetails, getSellerDashboard, updateProperty, updatePropertyStatus } from '../controllers/property.controller.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import { updateProfile } from '../controllers/user.controller.js';

const PropertyRouter = express.Router();


PropertyRouter.get("/", getAllProperties);

//protect the routes tha only seller can do these works

PropertyRouter.post("/", protect,authorize("seller"), upload.array("images", 10), addProperty);
PropertyRouter.get("/my", protect,authorize("seller"), getMyProperties);
PropertyRouter.put("/:id", protect,authorize("seller"), upload.array("images", 10), updateProperty)

PropertyRouter.delete("/:id", protect,authorize("seller"), deleteProperty);
PropertyRouter.patch("/:id/status", protect,authorize("seller"), updatePropertyStatus)

PropertyRouter.get("/counts", getPropertyCounts)
PropertyRouter.get("/:id", getPropertyDetails)

PropertyRouter.get("/seller/dashboard", protect, authorize("seller"), getSellerDashboard);

export default PropertyRouter;