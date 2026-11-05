import express from "express";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { approveSeller, blockUser, deleteUser, getAllProperties, getAllUsers, getDashboardStats, getPendingSellers } from "../controllers/admin.controller.js";
import { deleteProperty } from "../controllers/admin.controller.js";
import {getPendingCompanies,getCompanyVerificationDetails, viewCompanyVerificationDocument,reviewCompanyDocument,rejectCompany, approveCompany} from "../controllers/companyVerification.controller.js";

import {
  getCompanyVerificationOverview,
  getCompanyApplications,
} from "../controllers/companyVerificationDashboard.controller.js";


const adminRouter = express.Router();


adminRouter.use(protect, authorize("admin"));

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/block", blockUser);

adminRouter.delete("/users/:id", deleteUser);
adminRouter.get("/properties", getAllProperties);

adminRouter.get("/pending-sellers", getPendingSellers);
// New company verification endpoint
adminRouter.get("/companies/pending", getPendingCompanies);

// Search, filter, sort and paginate company applications
adminRouter.get("/companies", getCompanyApplications);

// Company verification dashboard statistics
adminRouter.get(
  "/companies/overview",
  getCompanyVerificationOverview
);

// View company application details
adminRouter.get("/companies/:companyId", getCompanyVerificationDetails);

// View a company verification document
adminRouter.get("/companies/:companyId/documents/:documentId/view",viewCompanyVerificationDocument);


// Reject a pending company application
adminRouter.patch( "/companies/:companyId/reject",rejectCompany);

adminRouter.delete("/properties/:id", deleteProperty)



// Review a company verification document
adminRouter.patch("/companies/:companyId/documents/:documentId/review",reviewCompanyDocument);

// Approve a verified real-estate company
adminRouter.patch("/companies/:companyId/approve",approveCompany);



adminRouter.get("/stats/", getDashboardStats)



adminRouter.patch("/approve-seller/:id", approveSeller)


export default adminRouter;