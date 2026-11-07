import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

import { approveCompany } from "../controllers/companyVerification.controller.js";

test("Approve company and activate founding administrator", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  // Connect to the isolated test database
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "plotbase_phase1a_test",
  });

  let company;

  try {
    // Prevent accidental writes to the main database
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

    // Create a test company with simulated verified documents
    company = await Company.create({
      name: "Plotbase Approval Test Company",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "approval-test@example.com",
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

    // Create pending founding company membership
    await CompanyMembership.create({
      userId: applicantId,
      companyId: company._id,
      role: "COMPANY_ADMIN",
      status: "PENDING",
    });

    // Simulate an authenticated platform administrator
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

    // Execute the actual company approval controller
    await approveCompany(req, res);

    assert.equal(
      statusCode,
      200,
      JSON.stringify(responseBody)
    );

    assert.equal(responseBody.success, true);

    // Verify company approval
    const updatedCompany = await Company.findById(company._id);

    assert.equal(
      updatedCompany.verificationStatus,
      "APPROVED"
    );

    // Verify company administrator activation
    const membership = await CompanyMembership.findOne({
      companyId: company._id,
      userId: applicantId,
    });

    assert.ok(membership);
    assert.equal(membership.status, "ACTIVE");
    assert.ok(membership.joinedAt);

    console.log(
      "Company approval and membership activation passed"
    );

  } finally {
    // Remove only records created by this test
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