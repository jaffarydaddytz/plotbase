import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";

import {
  reviewCompanyDocument,
} from "../controllers/companyVerification.controller.js";

test("Cannot review an already rejected document", async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "plotbase_phase1a_test",
  });

  let company;

  try {
    assert.equal(
      mongoose.connection.name,
      "plotbase_phase1a_test"
    );

    company = await Company.create({
      name: "Plotbase Document Review Test",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "review-test@example.com",
      contactPhone: "+255712345678",
      address: "Dar es Salaam",
      createdBy: new mongoose.Types.ObjectId(),
      verificationStatus: "PENDING",

      verificationDocuments: [
        {
          documentType: "REGISTRATION_CERTIFICATE",
          storageKey: "test/rejected-document.png",
          reviewStatus: "REJECTED",
          reviewNotes: "Invalid test document",
        },
      ],
    });

    const documentId = company.verificationDocuments[0]._id;

    const req = {
      params: {
        companyId: company._id.toString(),
        documentId: documentId.toString(),
      },
      body: {
        reviewStatus: "VERIFIED",
        reviewNotes: "Attempting to change previous review",
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
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

    await reviewCompanyDocument(req, res);

    // Previously reviewed document must be rejected
    assert.equal(statusCode, 409);
    assert.equal(responseBody.success, false);

    // Verify original decision remains unchanged
    const updatedCompany = await Company.findById(company._id);

    const document =
      updatedCompany.verificationDocuments.id(documentId);

    assert.equal(document.reviewStatus, "REJECTED");
    assert.equal(document.reviewNotes, "Invalid test document");

    // Company must remain pending
    assert.equal(
      updatedCompany.verificationStatus,
      "PENDING"
    );

  } finally {
    if (company) {
      await Company.deleteOne({ _id: company._id });
    }

    await mongoose.disconnect();
  }
});