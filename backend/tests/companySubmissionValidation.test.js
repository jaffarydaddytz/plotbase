import dotenv from "dotenv";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import { submitCompanyApplication } from "../controllers/company.controller.js";

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
        positionTitle: "",
        relationshipToCompany: "Director",
        authorizedToApply: true,
      },

      verificationStatus: "DRAFT",
      submittedAt: null,
      submittedBy: null,
      verificationDocuments: [],
    });

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

    assert.equal(statusCode, 422, JSON.stringify(responseBody));
    assert.equal(responseBody.success, false);

    assert.ok(
      responseBody.missingFields?.includes("positionTitle"),
      "Position/title should be reported as missing"
    );

    const updatedCompany = await Company.findById(company._id);

    assert.ok(updatedCompany);
    assert.equal(updatedCompany.verificationStatus, "DRAFT");
    assert.equal(updatedCompany.submittedAt, null);
    assert.equal(updatedCompany.submittedBy, null);

    console.log(
      "PASS: Incomplete applicant information blocks submission"
    );
  } finally {
    if (company) {
      await Company.deleteOne({ _id: company._id });
    }

    await mongoose.disconnect();
  }
});

test("Submit a complete company application and record submission details", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const testDatabase = "plotbase_phase1a_test";

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: testDatabase,
  });

  let company;

  try {
    assert.equal(mongoose.connection.name, testDatabase);

    const applicantId = new mongoose.Types.ObjectId();

    const requiredDocuments = [
      "REGISTRATION_CERTIFICATE",
      "TAX_CERTIFICATE",
      "BUSINESS_LICENSE",
    ];

    company = await Company.create({
      name: "Plotbase Successful Submission Test",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "submission-test@example.com",
      contactPhone: "+255712345678",
      address: "Dar es Salaam",

      createdBy: applicantId,

      applicantInfo: {
        fullName: "Draft Applicant",
        email: "draft@example.com",
        phone: "+255754123456",
        positionTitle: "Managing Director",
        relationshipToCompany: "Director",
        authorizedToApply: true,
      },

      verificationStatus: "DRAFT",
      submittedAt: null,
      submittedBy: null,

      verificationDocuments: requiredDocuments.map((type) => ({
        documentType: type,
        storageKey: `test/${type}`,
        reviewStatus: "VERIFIED",
      })),
    });

    const req = {
      params: {
        companyId: company._id.toString(),
      },

      user: {
        _id: applicantId,
        name: "Verified Applicant",
        email: "verified@example.com",
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

    const beforeSubmission = new Date();

    await submitCompanyApplication(req, res);

    const afterSubmission = new Date();

    assert.equal(
      statusCode,
      200,
      JSON.stringify(responseBody)
    );

    assert.equal(responseBody.success, true);

    const updatedCompany = await Company.findById(company._id);

    assert.ok(updatedCompany);

    // Verify application status.
    assert.equal(
      updatedCompany.verificationStatus,
      "PENDING"
    );

    // Verify the authenticated user was recorded.
    assert.equal(
      updatedCompany.submittedBy.toString(),
      applicantId.toString()
    );

    // Verify submission timestamp.
    assert.ok(
      updatedCompany.submittedAt instanceof Date
    );

    assert.ok(
      updatedCompany.submittedAt >= beforeSubmission
    );

    assert.ok(
      updatedCompany.submittedAt <= afterSubmission
    );

    // Verify applicant identity was captured at submission.
    assert.equal(
      updatedCompany.applicantInfo.fullName,
      "Verified Applicant"
    );

    assert.equal(
      updatedCompany.applicantInfo.email,
      "verified@example.com"
    );

    // Verify existing applicant information is preserved.
    assert.equal(
      updatedCompany.applicantInfo.positionTitle,
      "Managing Director"
    );

    assert.equal(
      updatedCompany.applicantInfo.authorizedToApply,
      true
    );

    console.log(
      "PASS: Company submitted with applicant identity and timestamp"
    );

  } finally {
    if (company) {
      await Company.deleteOne({
        _id: company._id,
      });
    }

    await mongoose.disconnect();
  }
});
