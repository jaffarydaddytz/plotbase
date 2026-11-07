test("Reject attempts to change applicant identity", async () => {
  const applicantId = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();

  const forbiddenUpdates = [
    {
      fullName: "Another Person",
    },
    {
      email: "another@example.com",
    },
  ];

  for (const applicantInfo of forbiddenUpdates) {
    const req = {
      params: {
        companyId: companyId.toString(),
      },

      user: {
        _id: applicantId,
      },

      body: {
        applicantInfo,
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

    await updateCompanyDraft(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseBody.success, false);

    assert.equal(
      responseBody.message,
      "Invalid applicant information fields"
    );
  }

  console.log("PASS: Applicant identity modification rejected");
});

test("Prevent another investor from editing a company draft", async () => {
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

    // Two different investors
    const ownerId = new mongoose.Types.ObjectId();
    const otherInvestorId = new mongoose.Types.ObjectId();

    // Create a draft belonging to the first investor.
    company = await Company.create({
      name: "Plotbase Ownership Test Company",
      registrationNumber: `TEST-${randomUUID()}`,
      contactEmail: "ownership-test@example.com",
      contactPhone: "+255712345678",
      address: "Dar es Salaam",

      createdBy: ownerId,

      applicantInfo: {
        fullName: "Original Applicant",
        email: "original@example.com",
        phone: "+255712345678",
        positionTitle: "Managing Director",
        relationshipToCompany: "Director",
        authorizedToApply: true,
      },

      verificationStatus: "DRAFT",
    });

    // Another investor attempts to update the draft.
    const req = {
      params: {
        companyId: company._id.toString(),
      },

      user: {
        _id: otherInvestorId,
      },

      body: {
        applicantInfo: {
          positionTitle: "Chief Executive Officer",
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

    await updateCompanyDraft(req, res);

    // Unauthorized investor must be rejected.
    assert.equal(statusCode, 404);
    assert.equal(responseBody.success, false);

    // Confirm the database was not modified.
    const updatedCompany = await Company.findById(
      company._id
    );

    assert.equal(
      updatedCompany.applicantInfo.positionTitle,
      "Managing Director"
    );

    assert.equal(
      updatedCompany.createdBy.toString(),
      ownerId.toString()
    );

    assert.equal(
      updatedCompany.verificationStatus,
      "DRAFT"
    );

    console.log(
      "PASS: Unauthorized investor cannot edit company draft"
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