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