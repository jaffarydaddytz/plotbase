import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { connectDB } from "../config/db.js";
import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

// Load backend/.env regardless of the terminal's current directory.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

// Optional argument: company ID or registration number.
// Without an argument, check every approved company.
const companyIdentifier = process.argv[2];

const printCheck = (label, passed) => {
  console.log(`${passed ? "✓ PASS" : "✗ FAIL"} — ${label}`);
  return passed;
};

const verifyCompany = async (company) => {
  console.log("\n========================================");
  console.log(`COMPANY: ${company.name}`);
  console.log(`REGISTRATION: ${company.registrationNumber}`);
  console.log(`STATUS: ${company.verificationStatus}`);
  console.log("========================================");

  // Find the founding company administrator membership.
  const membership = await CompanyMembership.findOne({
    companyId: company._id,
    userId: company.createdBy,
  }).select("companyId userId role status joinedAt");

  const checks = [
    [
      "Company status is APPROVED",
      company.verificationStatus === "APPROVED",
    ],
    [
      "Company approval date recorded",
      Boolean(company.reviewedAt),
    ],
    [
      "Reviewing administrator recorded",
      Boolean(company.reviewedBy),
    ],
    [
      "Founding administrator membership exists",
      Boolean(membership),
    ],
    [
      "Membership role is COMPANY_ADMIN",
      membership?.role === "COMPANY_ADMIN",
    ],
    [
      "Membership status is ACTIVE",
      membership?.status === "ACTIVE",
    ],
    [
      "Membership activation date recorded",
      Boolean(membership?.joinedAt),
    ],
    [
      "Membership belongs to the correct company",
      Boolean(
        membership?.companyId?.equals(company._id)
      ),
    ],
    [
      "Membership belongs to the company founder",
      Boolean(
        membership?.userId?.equals(company.createdBy)
      ),
    ],
  ];

  let passed = 0;

  for (const [label, result] of checks) {
    if (printCheck(label, result)) {
      passed++;
    }
  }

  console.log("\n----------------------------------------");
  console.log(`RESULT: ${passed}/${checks.length} checks passed`);
  console.log("----------------------------------------");

  return passed === checks.length;
};

const main = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from backend/.env"
      );
    }

    console.log("\nPLOTBASE — COMPANY APPROVAL VERIFICATION");
    console.log("Connecting to development database...\n");

    await connectDB();

    let companies = [];

    if (companyIdentifier) {
      // Check a specific company.
      const company = mongoose.isValidObjectId(companyIdentifier)
        ? await Company.findById(companyIdentifier)
        : await Company.findOne({
            registrationNumber:
              companyIdentifier.trim().toUpperCase(),
          });

      if (company) {
        companies = [company];
      }
    } else {
      // Check all approved companies.
      companies = await Company.find({
        verificationStatus: "APPROVED",
      }).sort({ reviewedAt: -1 });
    }

    if (companies.length === 0) {
      console.log("No matching companies found.");
      process.exitCode = 1;
      return;
    }

    let successful = 0;

    for (const company of companies) {
      const valid = await verifyCompany(company);

      if (valid) {
        successful++;
      }
    }

    console.log("\n========================================");
    console.log("PLOTBASE VERIFICATION SUMMARY");
    console.log("========================================");
    console.log(`Companies checked: ${companies.length}`);
    console.log(`Passed: ${successful}`);
    console.log(`Failed: ${companies.length - successful}`);

    if (successful === companies.length) {
      console.log("\n✓ ALL VERIFICATION CHECKS PASSED");
    } else {
      console.log("\n✗ SOME VERIFICATION CHECKS FAILED");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("\nVerification error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await main();