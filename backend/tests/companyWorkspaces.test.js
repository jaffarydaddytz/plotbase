import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

import { getMyWorkspaces } from "../controllers/companyWorkspaces.controller.js";

// =====================================================
// TEST HELPERS
// =====================================================

const createTestCompany = async ({
  createdBy,
  verificationStatus = "APPROVED",
}) => {
  return Company.create({
    name: `Plotbase Workspace Test ${randomUUID()}`,
    registrationNumber: `TEST-WS-${randomUUID()}`,
    contactEmail: "workspace-test@example.com",
    contactPhone: "+255712345678",
    address: "Dar es Salaam",
    createdBy,
    verificationStatus,
  });
};

const executeController = async (userId) => {
  let statusCode = 200;
  let responseBody;

  const req = {
    user: {
      _id: userId,
    },
  };

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

  await getMyWorkspaces(req, res);

  return {
    statusCode,
    responseBody,
  };
};

// =====================================================
// MY WORKSPACES TEST
// =====================================================

test(
  "My Workspaces returns only approved companies with active memberships",
  async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "plotbase_phase1a_test",
    });

    const createdCompanyIds = [];

    try {
      // Prevent accidental writes to the main database.
      assert.equal(
        mongoose.connection.name,
        "plotbase_phase1a_test"
      );

      const investorId = new mongoose.Types.ObjectId();
      const anotherInvestorId = new mongoose.Types.ObjectId();

      // =================================================
      // CREATE TEST COMPANIES
      // =================================================

      const approvedCompany = await createTestCompany({
        createdBy: investorId,
        verificationStatus: "APPROVED",
      });

      createdCompanyIds.push(approvedCompany._id);

      const pendingCompany = await createTestCompany({
        createdBy: investorId,
        verificationStatus: "PENDING",
      });

      createdCompanyIds.push(pendingCompany._id);

      const suspendedCompany = await createTestCompany({
        createdBy: investorId,
        verificationStatus: "SUSPENDED",
      });

      createdCompanyIds.push(suspendedCompany._id);

      const suspendedMembershipCompany =
        await createTestCompany({
          createdBy: investorId,
          verificationStatus: "APPROVED",
        });

      createdCompanyIds.push(
        suspendedMembershipCompany._id
      );

      const revokedMembershipCompany =
        await createTestCompany({
          createdBy: investorId,
          verificationStatus: "APPROVED",
        });

      createdCompanyIds.push(
        revokedMembershipCompany._id
      );

      const anotherInvestorCompany =
        await createTestCompany({
          createdBy: anotherInvestorId,
          verificationStatus: "APPROVED",
        });

      createdCompanyIds.push(
        anotherInvestorCompany._id
      );

      // =================================================
      // CREATE COMPANY MEMBERSHIPS
      // =================================================

      await CompanyMembership.create([
        {
          userId: investorId,
          companyId: approvedCompany._id,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
        },
        {
          userId: investorId,
          companyId: pendingCompany._id,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
        },
        {
          userId: investorId,
          companyId: suspendedCompany._id,
          role: "MANAGER",
          status: "ACTIVE",
        },
        {
          userId: investorId,
          companyId: suspendedMembershipCompany._id,
          role: "SALES_OFFICER",
          status: "SUSPENDED",
        },
        {
          userId: investorId,
          companyId: revokedMembershipCompany._id,
          role: "ACCOUNTANT",
          status: "REVOKED",
        },
        {
          userId: anotherInvestorId,
          companyId: anotherInvestorCompany._id,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
        },
      ]);

      // =================================================
      // TEST 1: RETURN ONLY ELIGIBLE WORKSPACES
      // =================================================

      const result = await executeController(investorId);

      assert.equal(result.statusCode, 200);
      assert.equal(result.responseBody.success, true);

      assert.ok(
        Array.isArray(result.responseBody.workspaces)
      );

      assert.equal(
        result.responseBody.workspaces.length,
        1
      );

      const workspace = result.responseBody.workspaces[0];

      assert.equal(
        String(workspace.companyId),
        String(approvedCompany._id)
      );

      assert.equal(
        workspace.name,
        approvedCompany.name
      );

      assert.equal(
        workspace.role,
        "COMPANY_ADMIN"
      );

      assert.equal(
        workspace.registrationNumber,
        approvedCompany.registrationNumber
      );

      // =================================================
      // TEST 2: INVESTOR WITHOUT MEMBERSHIPS
      // =================================================

      const unrelatedInvestorId =
        new mongoose.Types.ObjectId();

      const emptyResult = await executeController(
        unrelatedInvestorId
      );

      assert.equal(emptyResult.statusCode, 200);
      assert.equal(emptyResult.responseBody.success, true);

      assert.deepEqual(
        emptyResult.responseBody.workspaces,
        []
      );

    } finally {
      // =================================================
      // CLEAN UP TEST RECORDS
      // =================================================

      if (createdCompanyIds.length > 0) {
        await CompanyMembership.deleteMany({
          companyId: {
            $in: createdCompanyIds,
          },
        });

        await Company.deleteMany({
          _id: {
            $in: createdCompanyIds,
          },
        });
      }

      await mongoose.disconnect();
    }
  }
);