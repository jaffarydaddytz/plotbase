import dotenv from "dotenv";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";

import {
  submitCompanyApplication,
} from "../controllers/company.controller.js";

dotenv.config({ path: "backend/.env" });

test("Reject company submission when applicant title is missing", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const testDatabase = "plotbase_phase1a_test";

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: testDatabase,
  });

  let company;

  try {
    // Ensure tests cannot write to the main application database.
    assert.equal(mongoose.connection.name, testDatabase);

    const applicantId = new mongoose.Types.ObjectId();

    company = await Company.create({
      name: "Plotbase Submission Validation Test",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "company-test@example.com",
      contactPhone: "+255712345678",
      address: "Dar es Salaam",

      createdBy: applicantId,

      applicantInfo: {
        fullName: "Test Applicant",
        email: "applicant@example.com",
        phone: "+255712345678",

        // Intentionally missing.
        positionTitle: "",

        relationshipToCompany: "Director",
        authorizedToApply: true,
      },

      verificationStatus: "DRAFT",
      submittedAt: null,
      submittedBy: null,
      verificationDocuments: [],
    });

    // Simulate the authenticated applicant submitting.
    const req = {
      params: {
        companyId: company._id.toString(),
      },
      user: {
        _id: applicantId,
        name: "Test Applicant",
        email: "applicant@example.com",
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

    await submitCompanyApplication(req, res);

    // Submission must be rejected.
    assert.equal(
      statusCode,
      422,
      JSON.stringify(responseBody)
    );

    assert.equal(responseBody.success, false);

    assert.ok(
      responseBody.missingFields?.includes("positionTitle"),
      "Position/title should be reported as missing"
    );

    // Verify that the database remains unchanged.
    const updatedCompany = await Company.findById(
      company._id
    );

    assert.ok(updatedCompany);

    assert.equal(
      updatedCompany.verificationStatus,
      "DRAFT"
    );

    assert.equal(updatedCompany.submittedAt, null);
    assert.equal(updatedCompany.submittedBy, null);

    console.log(
      "PASS: Incomplete applicant information blocks submission"
    );

  } finally {
    // Clean up only the record created by this test.
    if (company) {
      await Company.deleteOne({
        _id: company._id,
      });
    }

    await mongoose.disconnect();
  }
});