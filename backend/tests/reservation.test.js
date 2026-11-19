import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Company from "../models/company.model.js";
import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import Reservation from "../models/reservation.model.js";

import {
  createPlotReservation,
  cancelPlotReservation,
} from "../services/reservationService.js";

// ==========================================
// TEST CONFIGURATION
// ==========================================

// Tests use temporary fixtures in the
// existing Plotbase development database.
//
// DO NOT run against production.

const testUri = process.env.MONGODB_URI;

const expectedDatabase =
  process.env.TEST_DB_NAME || "plotdb";

// ==========================================
// TEST GEOJSON GEOMETRY
// ==========================================

const coordinates = [
  [
    [39.25, -6.8],
    [39.2502, -6.8],
    [39.2502, -6.8002],
    [39.25, -6.8002],
    [39.25, -6.8],
  ],
];

// ==========================================
// EXPECTED ERROR HELPER
// ==========================================

const expectStatusError = (action, statusCode) =>
  assert.rejects(action, (error) => {
    assert.equal(error?.statusCode, statusCode);
    return true;
  });

// ==========================================
// RESERVATION INTEGRATION TESTS
// ==========================================

test(
  "Plot reservations and transaction safety",
  { timeout: 120000 },
  async (t) => {
    // ======================================
    // DATABASE SAFETY CHECKS
    // ======================================

    assert.ok(
      testUri,
      "MONGODB_URI is missing"
    );

    assert.notEqual(
      process.env.NODE_ENV,
      "production",
      "Tests cannot run in production mode"
    );

    assert.equal(
      process.env.ALLOW_EXISTING_DB_TESTS,
      "YES",
      "Set ALLOW_EXISTING_DB_TESTS=YES to run database integration tests"
    );

    // ======================================
    // TEST IDENTIFIERS
    // ======================================

    const marker =
      `RESERVATION-TEST-${randomUUID()}`;

    const companyIds = [];
    const projectIds = [];

    const creatorId =
      new mongoose.Types.ObjectId();

    const investorA =
      new mongoose.Types.ObjectId();

    const investorB =
      new mongoose.Types.ObjectId();

    // ======================================
    // CREATE TEMPORARY COMPANY
    // ======================================

    const createCompany = async (
      verificationStatus
    ) => {
      const _id =
        new mongoose.Types.ObjectId();

      companyIds.push(_id);

      // Fixture bypasses company onboarding,
      // which is not under test.

      await Company.collection.insertOne({
        _id,

        name:
          `${marker}-${verificationStatus}`,

        registrationNumber:
          `TEST-${randomUUID()}`,

        contactEmail:
          `test-${randomUUID()}@example.invalid`,

        contactPhone: "+255700000000",

        address: "Temporary test address",

        createdBy: creatorId,

        verificationStatus,

        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return _id;
    };

    // ======================================
    // CREATE TEMPORARY PROJECT AND PLOT
    // ======================================

    const createFixture = async ({
      companyId,
      status = "ACTIVE",
      plotStatus = "AVAILABLE",
      totalPrice = 2500000,
    }) => {
      const projectId =
        new mongoose.Types.ObjectId();

      projectIds.push(projectId);

      const project = await Project.create({
        _id: projectId,

        companyId,

        createdBy: creatorId,

        title: `${marker}-PROJECT`,

        description:
          "Temporary reservation integration test project",

        location: "Dar es Salaam",

        projectType: "VIWANJA",

        pricePerSqm: 5000,

        status,
      });

      const plot = await Plot.create({
        projectId,

        plotNumber:
          `TEST-${randomUUID()}`,

        areaSqm: 500,

        totalPrice,

        status: plotStatus,

        geometry: "Polygon",

        coordinates,
      });

      return {
        project,
        plot,
      };
    };

    // ======================================
    // BOOKING HELPER
    // ======================================

    const book = (
      { project, plot },
      investorId = investorA
    ) =>
      createPlotReservation({
        investorId,
        projectId: project._id,
        plotId: plot._id,
      });

    // ======================================
    // CONNECT TO DATABASE
    // ======================================

    try {
      await mongoose.connect(testUri);

      // ====================================
      // VERIFY DATABASE NAME
      // ====================================

      assert.equal(
        mongoose.connection.db.databaseName,
        expectedDatabase,
        `Wrong database: reservation tests require ${expectedDatabase}`
      );

      // ====================================
      // VERIFY UNIQUE RESERVATION INDEX
      // ====================================

      const indexes =
        await mongoose.connection.db
          .collection("reservations")
          .listIndexes()
          .toArray();

      const uniqueIndex = indexes.find(
        (index) => {
          const statuses =
            index.partialFilterExpression
              ?.status?.$in;

          return (
            index.name ===
              "unique_active_plot_reservation" &&

            index.unique === true &&

            index.key?.plotId === 1 &&

            Object.keys(index.key).length === 1 &&

            Array.isArray(statuses) &&

            statuses.includes("PENDING") &&

            statuses.includes("CONFIRMED")
          );
        }
      );

      assert.ok(
        uniqueIndex,
        "Unique active reservation index is missing"
      );

      // ====================================
      // CREATE TEST COMPANIES
      // ====================================

      const approvedCompanyId =
        await createCompany("APPROVED");

      const rejectedCompanyId =
        await createCompany("REJECTED");

      // ====================================
      // TEST 1: SUCCESSFUL BOOKING
      // ====================================

      await t.test(
        "Investor can reserve an available plot",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const result = await book(fixture);

          assert.equal(
            result.status,
            "PENDING"
          );

          assert.equal(
            result.plotStatus,
            "RESERVED"
          );

          assert.equal(
            result.totalPrice,
            2500000
          );

          assert.ok(
            new Date(result.expiresAt).getTime() >
              Date.now()
          );

          const savedPlot =
            await Plot.findById(
              fixture.plot._id
            ).lean();

          const savedReservation =
            await Reservation.findById(
              result.id
            ).lean();

          assert.equal(
            savedPlot.status,
            "RESERVED"
          );

          assert.ok(savedReservation);

          assert.equal(
            savedReservation.status,
            "PENDING"
          );

          assert.equal(
            String(savedReservation.investorId),
            String(investorA)
          );

          assert.equal(
            String(savedReservation.plotId),
            String(fixture.plot._id)
          );

          assert.equal(
            savedReservation.totalPrice,
            2500000
          );
        }
      );

      // ====================================
      // TEST 2: SUCCESSFUL CANCELLATION
      // ====================================

      await t.test(
        "Investor can cancel a pending reservation",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const booking = await book(fixture);

          const cancelled =
            await cancelPlotReservation({
              investorId: investorA,
              reservationId: booking.id,
            });

          assert.equal(
            cancelled.status,
            "CANCELLED"
          );

          assert.equal(
            cancelled.plotStatus,
            "AVAILABLE"
          );

          assert.ok(cancelled.cancelledAt);

          const reservation =
            await Reservation.findById(
              booking.id
            ).lean();

          const plot =
            await Plot.findById(
              fixture.plot._id
            ).lean();

          assert.equal(
            reservation.status,
            "CANCELLED"
          );

          assert.ok(reservation.cancelledAt);

          assert.equal(
            plot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: plot._id,
            }),
            1
          );
        }
      );

      // ====================================
      // TEST 3: DOUBLE BOOKING
      // ====================================

      await t.test(
        "A reserved plot cannot be booked again",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          await book(fixture, investorA);

          await expectStatusError(
            () => book(fixture, investorB),
            409
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
              status: "PENDING",
            }),
            1
          );
        }
      );

      // ====================================
      // TEST 4: CONCURRENT BOOKINGS
      // ====================================

      await t.test(
        "Two simultaneous bookings cannot both succeed",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const outcomes =
            await Promise.allSettled([
              book(fixture, investorA),
              book(fixture, investorB),
            ]);

          const successes =
            outcomes.filter(
              (result) =>
                result.status === "fulfilled"
            );

          const failures =
            outcomes.filter(
              (result) =>
                result.status === "rejected"
            );

          assert.equal(
            successes.length,
            1
          );

          assert.equal(
            failures.length,
            1
          );

          assert.equal(
            failures[0].reason.statusCode,
            409
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            1
          );

          const savedPlot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            savedPlot.status,
            "RESERVED"
          );
        }
      );

      // ====================================
      // TEST 5: DRAFT PROJECT
      // ====================================

      await t.test(
        "Draft projects cannot accept reservations",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
              status: "DRAFT",
            });

          await expectStatusError(
            () => book(fixture),
            404
          );

          const savedPlot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            savedPlot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 6: UNAPPROVED COMPANY
      // ====================================

      await t.test(
        "Unapproved companies cannot accept bookings",
        async () => {
          const fixture =
            await createFixture({
              companyId: rejectedCompanyId,
            });

          await expectStatusError(
            () => book(fixture),
            404
          );

          const savedPlot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            savedPlot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 7: ALREADY RESERVED PLOT
      // ====================================

      await t.test(
        "Already reserved plots cannot be booked",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
              plotStatus: "RESERVED",
            });

          await expectStatusError(
            () => book(fixture),
            409
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 8: PROJECT OWNERSHIP
      // ====================================

      await t.test(
        "A plot must belong to the requested project",
        async () => {
          const first =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const second =
            await createFixture({
              companyId: approvedCompanyId,
            });

          await expectStatusError(
            () =>
              createPlotReservation({
                investorId: investorA,

                projectId:
                  first.project._id,

                plotId:
                  second.plot._id,
              }),
            409
          );

          const savedPlot =
            await Plot.findById(
              second.plot._id
            );

          assert.equal(
            savedPlot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: second.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 9: BOOKING TRANSACTION ROLLBACK
      // ====================================

      await t.test(
        "Failed reservation creation rolls back plot status",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const originalCreate =
            Reservation.create;

          try {
            Reservation.create = async () => {
              throw new Error(
                "Simulated reservation insert failure"
              );
            };

            await assert.rejects(
              () => book(fixture),
              /Simulated reservation insert failure/
            );
          } finally {
            Reservation.create =
              originalCreate;
          }

          const savedPlot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            savedPlot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 10: CANCELLATION OWNERSHIP
      // ====================================

      await t.test(
        "Investor cannot cancel another investor's reservation",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const booking =
            await book(fixture, investorA);

          await expectStatusError(
            () =>
              cancelPlotReservation({
                investorId: investorB,
                reservationId: booking.id,
              }),
            404
          );

          const reservation =
            await Reservation.findById(
              booking.id
            ).lean();

          assert.equal(
            reservation.status,
            "PENDING"
          );

          assert.equal(
            reservation.cancelledAt,
            null
          );

          assert.equal(
            String(reservation.investorId),
            String(investorA)
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "RESERVED"
          );
        }
      );

      // ====================================
      // TEST 11: REPEATED CANCELLATION
      // ====================================

      await t.test(
        "Investor cannot cancel the same reservation twice",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const booking =
            await book(fixture);

          await cancelPlotReservation({
            investorId: investorA,
            reservationId: booking.id,
          });

          await expectStatusError(
            () =>
              cancelPlotReservation({
                investorId: investorA,
                reservationId: booking.id,
              }),
            409
          );

          const reservation =
            await Reservation.findById(
              booking.id
            ).lean();

          assert.equal(
            reservation.status,
            "CANCELLED"
          );

          assert.ok(
            reservation.cancelledAt
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            1
          );
        }
      );

      // ====================================
      // TEST 12: CONFIRMED RESERVATION
      // ====================================

      await t.test(
        "Investor cannot cancel a confirmed reservation",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const booking =
            await book(fixture);

          // Test-only confirmation.
          // The real confirmation workflow
          // has not been implemented yet.

          await Reservation.findByIdAndUpdate(
            booking.id,
            {
              $set: {
                status: "CONFIRMED",
                confirmedAt: new Date(),
              },
            },
            {
              returnDocument: "after",
              runValidators: true,
            }
          );

          await expectStatusError(
            () =>
              cancelPlotReservation({
                investorId: investorA,
                reservationId: booking.id,
              }),
            409
          );

          const reservation =
            await Reservation.findById(
              booking.id
            ).lean();

          assert.equal(
            reservation.status,
            "CONFIRMED"
          );

          assert.equal(
            reservation.cancelledAt,
            null
          );

          assert.ok(
            reservation.confirmedAt
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "RESERVED"
          );
        }
      );

      // ====================================
      // TEST 13: CANCELLATION ROLLBACK
      // ====================================

      await t.test(
        "Failed plot release rolls back cancellation",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const booking =
            await book(fixture);

          const originalFindOneAndUpdate =
            Plot.findOneAndUpdate;

          try {
            // Simulate failure after the
            // reservation status update.

            Plot.findOneAndUpdate =
              async () => {
                throw new Error(
                  "Simulated plot release failure"
                );
              };

            await assert.rejects(
              () =>
                cancelPlotReservation({
                  investorId: investorA,
                  reservationId: booking.id,
                }),

              /Simulated plot release failure/
            );
          } finally {
            Plot.findOneAndUpdate =
              originalFindOneAndUpdate;
          }

          const reservation =
            await Reservation.findById(
              booking.id
            ).lean();

          assert.equal(
            reservation.status,
            "PENDING"
          );

          assert.equal(
            reservation.cancelledAt,
            null
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "RESERVED"
          );
        }
      );

      // ====================================
      // TEST 14: REBOOK AFTER CANCELLATION
      // ====================================

      await t.test(
        "Cancelled plots can be booked again without losing history",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
            });

          const first =
            await book(fixture, investorA);

          await cancelPlotReservation({
            investorId: investorA,
            reservationId: first.id,
          });

          const second =
            await book(fixture, investorB);

          assert.equal(
            second.status,
            "PENDING"
          );

          assert.notEqual(
            second.id,
            first.id
          );

          const history =
            await Reservation.find({
              plotId: fixture.plot._id,
            }).lean();

          assert.equal(
            history.length,
            2
          );

          assert.deepEqual(
            history
              .map((entry) => entry.status)
              .sort(),

            ["CANCELLED", "PENDING"]
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "RESERVED"
          );
        }
      );

      // ====================================
      // TEST 15: SOLD PLOT
      // ====================================

      await t.test(
        "Sold plots cannot be booked",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
              plotStatus: "SOLD",
            });

          await expectStatusError(
            () => book(fixture),
            409
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "SOLD"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 16: ZERO PRICE
      // ====================================

      await t.test(
        "Unpriced plots cannot be booked",
        async () => {
          const fixture =
            await createFixture({
              companyId: approvedCompanyId,
              totalPrice: 0,
            });

          await expectStatusError(
            () => book(fixture),
            409
          );

          const plot =
            await Plot.findById(
              fixture.plot._id
            );

          assert.equal(
            plot.status,
            "AVAILABLE"
          );

          assert.equal(
            await Reservation.countDocuments({
              plotId: fixture.plot._id,
            }),
            0
          );
        }
      );

      // ====================================
      // TEST 17: INVALID IDENTIFIERS
      // ====================================

      await t.test(
        "Invalid identifiers are rejected",
        async () => {
          await expectStatusError(
            () =>
              createPlotReservation({
                investorId: investorA,
                projectId: "invalid-id",

                plotId:
                  new mongoose.Types.ObjectId(),
              }),
            400
          );

          await expectStatusError(
            () =>
              cancelPlotReservation({
                investorId: investorA,
                reservationId: "invalid-id",
              }),
            400
          );
        }
      );

    } finally {
      // ======================================
      // CLEAN UP TEMPORARY TEST RECORDS
      // ======================================

      // Only remove IDs created during
      // this test run and only when connected
      // to the expected development database.

      try {
        const safeDatabase =
          mongoose.connection.readyState === 1 &&
          mongoose.connection.db?.databaseName ===
            expectedDatabase;

        if (safeDatabase) {
          if (projectIds.length > 0) {
            await Reservation.deleteMany({
              projectId: {
                $in: projectIds,
              },
            });

            await Plot.deleteMany({
              projectId: {
                $in: projectIds,
              },
            });

            await Project.deleteMany({
              _id: {
                $in: projectIds,
              },
            });
          }

          if (companyIds.length > 0) {
            await Company.deleteMany({
              _id: {
                $in: companyIds,
              },
            });
          }
        }
      } finally {
        await mongoose.disconnect();
      }
    }
  }
);