import { normalizePhone } from "./visitFormatting";

// ==========================================
// CONFIGURATION
// ==========================================

const FIKASITE_PATH = "/fikasite";

const VISIT_ID_PATTERN = /^[a-f0-9]{32}$/;

const MAX_PUBLIC_TOKEN_LENGTH = 12000;

// ==========================================
// VALIDATE VISIT ID
// ==========================================

export const isValidVisitId = (visitId) => {
  return (
    typeof visitId === "string" &&
    VISIT_ID_PATTERN.test(visitId)
  );
};

// ==========================================
// MANAGEMENT PATH
// ==========================================

export const getManagementPath = (visitId) => {
  if (!isValidVisitId(visitId)) {
    throw new Error("Invalid site visit ID.");
  }

  return `${FIKASITE_PATH}#manage=${visitId}`;
};

// ==========================================
// GENERATE MANAGEMENT LINK
// ==========================================

export const generateManagementLink = (visitId) => {
  return new URL(
    getManagementPath(visitId),
    window.location.origin
  ).href;
};

// ==========================================
// READ MANAGEMENT VISIT ID
// ==========================================

export const getManagementVisitId = (hash) => {
  const match = /^#manage=([a-f0-9]{32})$/.exec(
    hash || ""
  );

  return match ? match[1] : null;
};

// ==========================================
// VALIDATE PASTED MANAGEMENT LINK
// ==========================================

export const parseManagementLink = (value) => {
  const input = String(value ?? "").trim();

  if (!input) {
    throw new Error("Enter your management link.");
  }

  let url;

  try {
    url = new URL(input, window.location.origin);
  } catch {
    throw new Error("Enter a valid management link.");
  }

  if (url.origin !== window.location.origin) {
    throw new Error(
      "This management link belongs to a different website."
    );
  }

  if (
    url.pathname.replace(/\/+$/, "") !== FIKASITE_PATH
  ) {
    throw new Error(
      "This is not a valid FikaSite management link."
    );
  }

  if (url.search) {
    throw new Error("Invalid management link.");
  }

  const visitId = getManagementVisitId(url.hash);

  if (!visitId) {
    throw new Error(
      "Invalid FikaSite management link."
    );
  }

  return visitId;
};

// ==========================================
// VALIDATE PUBLIC VISIT TEXT
// ==========================================

const validatePublicText = (value, maxLength) => {
  if (typeof value !== "string") {
    throw new Error("Invalid visit information.");
  }

  const text = value.trim();

  if (!text || text.length > maxLength) {
    throw new Error("Invalid visit information.");
  }

  return text;
};

// ==========================================
// VALIDATE PUBLIC VISIT ID
// ==========================================

const validatePublicId = (publicId) => {
  if (!isValidVisitId(publicId)) {
    throw new Error(
      "Invalid public registration ID."
    );
  }

  return publicId;
};

// ==========================================
// VALIDATE VISIT DATE
// ==========================================

const validateVisitDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error("Invalid visit date.");
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Invalid visit date.");
  }

  return value;
};

// ==========================================
// VALIDATE DEPARTURE TIME
// ==========================================

const validateDepartureTime = (value) => {
  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  ) {
    throw new Error("Invalid departure time.");
  }

  return value;
};

// ==========================================
// CREATE PUBLIC VISIT SNAPSHOT
// ==========================================

const createPublicVisitSnapshot = (visit) => {
  if (!visit || typeof visit !== "object") {
    throw new Error("Invalid visit information.");
  }

  const publicId = validatePublicId(
    visit.publicId
  );

  const contactPhone = normalizePhone(
    visit.contactPhone
  );

  if (!contactPhone) {
    throw new Error(
      "Invalid organizer contact number."
    );
  }

  const fee = Number(visit.fee);

  if (
    !Number.isSafeInteger(fee) ||
    fee < 0
  ) {
    throw new Error("Invalid Go & Return Fee.");
  }

  // Only expose information intended for participants.

  return {
    version: 2,

    publicId,

    title: validatePublicText(
      visit.title,
      120
    ),

    organizer: validatePublicText(
      visit.organizer,
      100
    ),

    destination: validatePublicText(
      visit.destination,
      150
    ),

    visitDate: validateVisitDate(
      visit.visitDate
    ),

    departureTime: validateDepartureTime(
      visit.departureTime
    ),

    meetingPoint: validatePublicText(
      visit.meetingPoint,
      150
    ),

    contactPhone,

    fee,
  };
};

// ==========================================
// ENCODE PUBLIC VISIT INFORMATION
// ==========================================

const encodePublicVisit = (visit) => {
  const json = JSON.stringify(visit);

  const bytes = new TextEncoder().encode(json);

  const binary = Array.from(
    bytes,
    (byte) => String.fromCharCode(byte)
  ).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// ==========================================
// DECODE PUBLIC VISIT INFORMATION
// ==========================================

const decodePublicVisit = (token) => {
  if (
    typeof token !== "string" ||
    !token ||
    token.length > MAX_PUBLIC_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    throw new Error("Invalid registration link.");
  }

  const base64 = token
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const paddedBase64 = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    "="
  );

  const binary = atob(paddedBase64);

  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );

  const json = new TextDecoder(
    "utf-8",
    { fatal: true }
  ).decode(bytes);

  return JSON.parse(json);
};

// ==========================================
// GENERATE PUBLIC REGISTRATION PATH
// ==========================================

export const getPublicVisitPath = (visit) => {
  const snapshot = createPublicVisitSnapshot(
    visit
  );

  const token = encodePublicVisit(snapshot);

  if (token.length > MAX_PUBLIC_TOKEN_LENGTH) {
    throw new Error(
      "Registration link is too long."
    );
  }

  return `${FIKASITE_PATH}#visit=${token}`;
};

// ==========================================
// GENERATE PUBLIC REGISTRATION LINK
// ==========================================

export const generatePublicVisitLink = (visit) => {
  return new URL(
    getPublicVisitPath(visit),
    window.location.origin
  ).href;
};

// ==========================================
// READ PUBLIC VISIT FROM LINK
// ==========================================

export const getPublicVisitFromHash = (hash) => {
  if (
    typeof hash !== "string" ||
    !hash.startsWith("#visit=")
  ) {
    return null;
  }

  try {
    const token = hash.slice(
      "#visit=".length
    );

    const decodedVisit = decodePublicVisit(
      token
    );

    if (decodedVisit?.version !== 2) {
      return null;
    }

    return createPublicVisitSnapshot(
      decodedVisit
    );

  } catch {
    return null;
  }
};