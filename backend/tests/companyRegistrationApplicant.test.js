import dotenv from "dotenv";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

import {
  registerCompany,
} from "../controllers/company.controller.js";

dotenv.config({ path: "backend/.env" });

test("Register company with applicant information and founding membership", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const testDatabase = "plotbase_phase1a_test";

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: testDatabase,
  });

  const applicantId = new mongoose.Types.ObjectId();

  const registrationNumber = `TEST-${randomUUID()}`;

  try {
    // Ensure tests run against the isolated database.
    assert.equal(
      mongoose.connection.name,
      testDatabase
    );

    const req = {
      user: {
        _id: applicantId,
        name: "Test Applicant",
        email: "applicant@example.com",
      },

      body: {
        name: "Plotbase Applicant Registration Test",

        registrationNumber,

        contactEmail: "company@example.com",

        contactPhone: "+255712345678",

        address: "Dar es Salaam",

        applicantInfo: {
          phone: "+255754123456",

          positionTitle: "Managing Director",

          relationshipToCompany: "Director",

          authorizedToApply: true,
        },
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

    // Execute the actual registration controller.
    await registerCompany(req, res);

    assert.equal(
      statusCode,
      201,
      JSON.stringify(responseBody)
    );

    assert.equal(responseBody.success, true);

    assert.ok(responseBody.company?.id);

    // Retrieve the company from MongoDB.
    const company = await Company.findById(
      responseBody.company.id
    );

    assert.ok(company);

    // Verify company information.
    assert.equal(
      company.name,
      "Plotbase Applicant Registration Test"
    );

    assert.equal(
      company.registrationNumber,
      registrationNumber.toUpperCase()
    );

    assert.equal(
      company.verificationStatus,
      "DRAFT"
    );

    // Verify applicant identity.
    assert.equal(
      company.applicantInfo.fullName,
      "Test Applicant"
    );

    assert.equal(
      company.applicantInfo.email,
      "applicant@example.com"
    );

    // Verify personal information.
    assert.equal(
      company.applicantInfo.phone,
      "+255754123456"
    );

    assert.equal(
      company.applicantInfo.positionTitle,
      "Managing Director"
    );

    assert.equal(
      company.applicantInfo.relationshipToCompany,
      "Director"
    );

    assert.equal(
      company.applicantInfo.authorizedToApply,
      true
    );

    // Verify application ownership.
    assert.equal(
      company.createdBy.toString(),
      applicantId.toString()
    );

    // Verify no submission has occurred.
    assert.equal(company.submittedAt, null);

    assert.equal(company.submittedBy, null);

    // Verify founding company membership.
    const membership = await CompanyMembership.findOne({
      companyId: company._id,
      userId: applicantId,
    });

    assert.ok(membership);

    assert.equal(
      membership.role,
      "COMPANY_ADMIN"
    );

    assert.equal(
      membership.status,
      "PENDING"
    );

    console.log(
      "PASS: Company registration saves applicant information and founding membership"
    );

  } finally {
    // Clean up even if the controller creates a company
    // but fails before returning a successful response.
    const company = await Company.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
    });

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