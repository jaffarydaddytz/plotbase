import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

import { approveCompany } from "../controllers/companyVerification.controller.js";

test("Rollback company approval when membership activation fails", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "plotbase_phase1a_test",
  });

  let company;
  let activationAttempted = false;

  const originalUpdateOne = CompanyMembership.updateOne;

  try {
    assert.equal(
      mongoose.connection.name,
      "plotbase_phase1a_test"
    );

    const applicantId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const requiredDocuments = [
      "REGISTRATION_CERTIFICATE",
      "TAX_CERTIFICATE",
      "BUSINESS_LICENSE",
    ];

    // Create a fictional company for testing
    company = await Company.create({
      name: "Plotbase Rollback Test Company",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "rollback-test@example.com",
      contactPhone: "+255712345678",
      address: "Dar es Salaam",
      createdBy: applicantId,
      verificationStatus: "PENDING",

      verificationDocuments: requiredDocuments.map((type) => ({
        documentType: type,
        storageKey: `test/${type}`,
        reviewStatus: "VERIFIED",
      })),
    });

    // Create pending founding administrator membership
    await CompanyMembership.create({
      userId: applicantId,
      companyId: company._id,
      role: "COMPANY_ADMIN",
      status: "PENDING",
    });

    // Simulate membership activation failing
    CompanyMembership.updateOne = async () => {
      activationAttempted = true;
      return { modifiedCount: 0 };
    };

    const req = {
      params: {
        companyId: company._id.toString(),
      },
      user: {
        _id: adminId,
      },
    };

    let statusCode = 200;
    let responseBody;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },

      json(data) {
        responseBody = data;
        return this;
      },
    };

    // Execute the actual approval controller
    await approveCompany(req, res);

    // Confirm our simulated failure was reached
    assert.equal(activationAttempted, true);

    // Approval should fail
    assert.equal(statusCode, 500);
    assert.equal(responseBody.success, false);

    // Restore the original model method before database checks
    CompanyMembership.updateOne = originalUpdateOne;

    // Confirm MongoDB rolled back company approval
    const updatedCompany = await Company.findById(company._id);

    assert.equal(
      updatedCompany.verificationStatus,
      "PENDING"
    );

    // Confirm membership remains pending
    const membership = await CompanyMembership.findOne({
      companyId: company._id,
      userId: applicantId,
    });

    assert.ok(membership);
    assert.equal(membership.status, "PENDING");

    console.log(
      "Transaction rollback verified successfully"
    );

  } finally {
    // Always restore the original method
    CompanyMembership.updateOne = originalUpdateOne;

    // Clean up only this test's records
    if (company) {
      await CompanyMembership.deleteMany({
        companyId: company._id,
      });

      await Company.deleteOne({
        _id: company._id,
      });
    }

    await mongoose.disconnect();
  }
});