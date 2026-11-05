import Company from "../models/company.model.js";

// Company verification is a separate workflow from company drafts.
const SUBMITTED_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
const ALLOWED_SORT_FIELDS = [
  "name",
  "registrationNumber",
  "verificationStatus",
  "submittedAt",
  "reviewedAt",
  "createdAt",
];

// Tanzania is UTC+3 throughout the year. Work with UTC boundaries matching
// the calendar day that an administrator selects in Tanzania.
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseTanzaniaDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const utcMillis = Date.parse(`${value}T00:00:00+03:00`);
  if (!Number.isFinite(utcMillis)) return null;

  // Reject impossible calendar dates (e.g., February 30).
  const reconstructedDay = new Date(utcMillis + TZ_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  return reconstructedDay === value ? new Date(utcMillis) : null;
};

const getTanzaniaPeriodStart = (now, period) => {
  const localDate = new Date(now.getTime() + TZ_OFFSET_MS);
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const day = localDate.getUTCDate();

  const localMidnight =
    period === "month"
      ? Date.UTC(year, month, 1)
      : Date.UTC(year, month, day);

  return new Date(localMidnight - TZ_OFFSET_MS);
};

// Common validation for the statistics and listing endpoints.
const getSubmissionDateFilter = (req) => {
  const { dateFrom, dateTo } = req.query;

  if (
    (dateFrom !== undefined && typeof dateFrom !== "string") ||
    (dateTo !== undefined && typeof dateTo !== "string")
  ) {
    return { error: "Invalid date filter." };
  }

  const from = dateFrom ? parseTanzaniaDate(dateFrom) : null;
  const to = dateTo ? parseTanzaniaDate(dateTo) : null;

  if ((dateFrom && !from) || (dateTo && !to)) {
    return { error: "Dates must use a valid YYYY-MM-DD format." };
  }

  if (from && to && from > to) {
    return { error: "Start date cannot be after end date." };
  }

  if (!from && !to) return { filter: null };

  const filter = {};
  if (from) filter.$gte = from;
  if (to) filter.$lt = new Date(to.getTime() + DAY_MS);

  return { filter };
};

// GET /api/admin/companies/overview
// Counts the current status of companies submitted during the selected dates.
// With no dates, includes legacy applications lacking submittedAt.
export const getCompanyVerificationOverview = async (req, res) => {
  try {
    const dateResult = getSubmissionDateFilter(req);
    if (dateResult.error) {
      return res.status(400).json({
        success: false,
        message: dateResult.error,
      });
    }

    const submissionDateFilter = dateResult.filter
      ? { submittedAt: dateResult.filter }
      : {};

    const now = new Date();
    const todayStart = getTanzaniaPeriodStart(now, "day");
    const monthStart = getTanzaniaPeriodStart(now, "month");

    const [
      totalSubmitted,
      pending,
      active,
      rejected,
      suspended,
      submittedToday,
      submittedThisMonth,
    ] = await Promise.all([
      Company.countDocuments({
        verificationStatus: { $in: SUBMITTED_STATUSES },
        ...submissionDateFilter,
      }),
      Company.countDocuments({ verificationStatus: "PENDING", ...submissionDateFilter }),
      Company.countDocuments({ verificationStatus: "APPROVED", ...submissionDateFilter }),
      Company.countDocuments({ verificationStatus: "REJECTED", ...submissionDateFilter }),
      Company.countDocuments({ verificationStatus: "SUSPENDED", ...submissionDateFilter }),
      // Kept for backward compatibility, but not shown in the four compact cards.
      Company.countDocuments({
        verificationStatus: { $in: SUBMITTED_STATUSES },
        submittedAt: { $gte: todayStart, $lte: now },
      }),
      Company.countDocuments({
        verificationStatus: { $in: SUBMITTED_STATUSES },
        submittedAt: { $gte: monthStart, $lte: now },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Company verification statistics retrieved successfully",
      stats: {
        totalSubmitted,
        pending,
        active,
        rejected,
        suspended,
        submittedToday,
        submittedThisMonth,
      },
      filters: {
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
      },
      reportingTimezone: "Africa/Dar_es_Salaam",
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Company verification overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company verification statistics",
    });
  }
};

// GET /api/admin/companies
// Server-side search, filters, sorting and pagination for the verification table.
export const getCompanyApplications = async (req, res) => {
  try {
    const {
      search = "",
      status = "ALL",
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    if (
      [search, status, sortBy, sortOrder, page, limit].some(
        (value) => typeof value !== "string"
      )
    ) {
      return res.status(400).json({ success: false, message: "Invalid company listing parameters." });
    }

    const normalizedStatus = status.trim().toUpperCase();
    const normalizedSearch = search.trim();

    if (normalizedStatus !== "ALL" && !SUBMITTED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: "Invalid company verification status." });
    }

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: "Invalid sorting field." });
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({ success: false, message: "Sort order must be asc or desc." });
    }

    if (normalizedSearch.length > 100) {
      return res.status(400).json({ success: false, message: "Search cannot exceed 100 characters." });
    }

    if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit)) {
      return res.status(400).json({ success: false, message: "Page and limit must be positive integers." });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (!Number.isSafeInteger(pageNumber) || ![10, 25, 50].includes(pageSize)) {
      return res.status(400).json({ success: false, message: "Invalid page or page size." });
    }

    const dateResult = getSubmissionDateFilter(req);
    if (dateResult.error) {
      return res.status(400).json({ success: false, message: dateResult.error });
    }

    const filter = {
      verificationStatus: normalizedStatus === "ALL"
        ? { $in: SUBMITTED_STATUSES }
        : normalizedStatus,
    };

    if (normalizedSearch) {
      const safeSearch = escapeRegex(normalizedSearch);
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { registrationNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (dateResult.filter) filter.submittedAt = dateResult.filter;

    const direction = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: direction, _id: -1 };
    const skip = (pageNumber - 1) * pageSize;

    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({ success: false, message: "Requested page is too large." });
    }

    const [total, companies] = await Promise.all([
      Company.countDocuments(filter),
      Company.find(filter)
        // Never expose document storage keys or private uploaded materials in list results.
        .select(
          "name registrationNumber contactEmail contactPhone " +
          "address verificationStatus submittedAt reviewedAt createdAt"
        )
        .sort(sort)
        .collation({ locale: "en", strength: 2 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      success: true,
      message: "Company applications retrieved successfully.",
      companies,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      filters: {
        search: normalizedSearch,
        status: normalizedStatus,
        sortBy,
        sortOrder,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
      },
    });
  } catch (error) {
    console.error("Company applications listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company applications.",
    });
  }
};