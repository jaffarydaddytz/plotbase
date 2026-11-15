import test from "node:test";
import assert from "node:assert/strict";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";
import { requireCompanyMembership } from "../middlewares/companyAccess.middleware.js";

test("Company project creation permissions", async (t) => {
  const companyId = "507f1f77bcf86cd799439011";
  const userId = "507f1f77bcf86cd799439012";

  let currentRole;

  const queryResult = (value) => ({
    select: () => ({
      lean: async () => value
    })
  });

  // Simulate an active company membership.
  t.mock.method(CompanyMembership, "findOne", () =>
    queryResult({
      companyId,
      userId,
      role: currentRole,
      status: "ACTIVE"
    })
  );

  // Simulate an approved company.
  t.mock.method(Company, "findOne", () =>
    queryResult({
      _id: companyId,
      verificationStatus: "APPROVED"
    })
  );

  const middleware = requireCompanyMembership(
    "COMPANY_ADMIN",
    "MANAGER"
  );

  const checkRole = async (role) => {
    currentRole = role;

    const req = {
      params: { companyId },
      user: { _id: userId }
    };

    let statusCode = null;
    let responseBody = null;
    let nextCalled = false;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await middleware(req, res, () => {
      nextCalled = true;
    });

    return { statusCode, responseBody, nextCalled };
  };

  // Roles that must be denied project creation.
  const deniedRoles = [
    "SALES_OFFICER",
    "ACCOUNTANT",
    "FIELD_OFFICER",
    "TITLE_DEED_OFFICER"
  ];

  for (const role of deniedRoles) {
    const result = await checkRole(role);

    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);

    console.log(`PASS: ${role} denied`);
  }

  // Roles permitted to create projects.
  const allowedRoles = [
    "COMPANY_ADMIN",
    "MANAGER"
  ];

  for (const role of allowedRoles) {
    const result = await checkRole(role);

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, null);

    console.log(`PASS: ${role} authorized`);
  }
});


test("Suspended company membership cannot create projects", async (t) => {
  const companyId = "507f1f77bcf86cd799439011";
  const userId = "507f1f77bcf86cd799439012";

  let membershipQuery;
  let nextCalled = false;
  let statusCode;
  let responseBody;

  // Simulate a user with no ACTIVE membership.
  // The user may have a suspended membership,
  // but it must not satisfy the ACTIVE query.
  t.mock.method(CompanyMembership, "findOne", (query) => {
    membershipQuery = query;

    return {
      select: () => ({
        lean: async () => null,
      }),
    };
  });

  const req = {
    params: { companyId },
    user: { _id: userId },
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

  const middleware = requireCompanyMembership(
    "COMPANY_ADMIN",
    "MANAGER"
  );

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(membershipQuery.status, "ACTIVE");
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);

  assert.equal(
    responseBody.message,
    "You do not have access to this company"
  );
});

test("Unapproved company cannot create projects", async (t) => {
  const companyId = "507f1f77bcf86cd799439011";
  const userId = "507f1f77bcf86cd799439012";

  let companyQuery;
  let statusCode;
  let responseBody;
  let nextCalled = false;

  // Simulate an ACTIVE COMPANY_ADMIN membership.
  t.mock.method(CompanyMembership, "findOne", () => ({
    select: () => ({
      lean: async () => ({
        companyId,
        userId,
        role: "COMPANY_ADMIN",
        status: "ACTIVE"
      })
    })
  }));

  // Simulate a company that does not satisfy
  // the APPROVED verification requirement.
  t.mock.method(Company, "findOne", (query) => {
    companyQuery = query;

    return {
      select: () => ({
        lean: async () => null
      })
    };
  });

  const req = {
    params: { companyId },
    user: { _id: userId }
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },

    json(data) {
      responseBody = data;
      return this;
    }
  };

  const middleware = requireCompanyMembership(
    "COMPANY_ADMIN",
    "MANAGER"
  );

  await middleware(req, res, () => {
    nextCalled = true;
  });

  // Verify that company approval is required.
  assert.equal(
    companyQuery.verificationStatus,
    "APPROVED"
  );

  // Verify that access is denied.
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);

  assert.equal(
    responseBody.message,
    "Company is not approved for operations"
  );
});