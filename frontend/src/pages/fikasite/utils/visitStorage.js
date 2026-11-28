import {
  formatText,
  normalizePhone,
} from "./visitFormatting";

// ==========================================
// STORAGE CONFIGURATION
// ==========================================

const STORAGE_PREFIX = "plotbase:fikasite:visit:";

const REGISTRATION_PREFIX =
  "plotbase:fikasite:registration:";

const ID_PATTERN = /^[a-f0-9]{32}$/;

// ==========================================
// PARTICIPANT STATUSES
// ==========================================

export const PARTICIPANT_STATUS = {
  REGISTERED: "REGISTERED",
  ATTENDED: "ATTENDED",
  NOT_ATTENDED: "NOT_ATTENDED",
  CANCELLED: "CANCELLED",
};

const VALID_PARTICIPANT_STATUSES = Object.values(
  PARTICIPANT_STATUS
);

// ==========================================
// GENERATE UNIQUE ID
// ==========================================

export const generateId = () => {
  const bytes = new Uint8Array(16);

  window.crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const isValidId = (id) => {
  return (
    typeof id === "string" &&
    ID_PATTERN.test(id)
  );
};

// ==========================================
// PARTICIPANT STATUS COMPATIBILITY
// ==========================================

export const getParticipantStatus = (participant) => {
  if (
    VALID_PARTICIPANT_STATUSES.includes(
      participant.status
    )
  ) {
    return participant.status;
  }

  return participant.attended === true
    ? PARTICIPANT_STATUS.ATTENDED
    : PARTICIPANT_STATUS.REGISTERED;
};

// ==========================================
// NORMALIZE PARTICIPANT
// ==========================================

const normalizeParticipant = (participant) => {
  const normalizedParticipant = {
    ...participant,

    fullName: formatText(participant.fullName),

    phone:
      normalizePhone(participant.phone) ||
      participant.phone,

    comingFrom: formatText(
      participant.comingFrom || ""
    ),

    numberOfPeople: Number(
      participant.numberOfPeople
    ),

    status: getParticipantStatus(participant),
  };

  delete normalizedParticipant.attended;

  return normalizedParticipant;
};

// ==========================================
// NORMALIZE VISIT
// ==========================================

const normalizeVisit = (visit) => {
  const normalizedVisit = {
    ...visit,

    version: 3,

    publicId: isValidId(visit.publicId)
      ? visit.publicId
      : generateId(),

    participants: Array.isArray(visit.participants)
      ? visit.participants.map(normalizeParticipant)
      : [],
  };

  delete normalizedVisit.capacity;

  return normalizedVisit;
};

// ==========================================
// CREATE SITE VISIT
// ==========================================

export const createVisit = (data) => {
  const timestamp = new Date().toISOString();

  const visit = {
    version: 3,

    // Management workspace ID.

    id: generateId(),

    // Separate public registration ID.

    publicId: generateId(),

    title: data.title.trim(),

    organizer: data.organizer.trim(),

    destination: formatText(data.destination),

    visitDate: data.visitDate,

    departureTime: data.departureTime,

    meetingPoint: formatText(data.meetingPoint),

    contactPhone:
      normalizePhone(data.contactPhone) ||
      data.contactPhone.trim(),

    fee: Number(data.fee),

    visibility: data.visibility,

    status: "OPEN",

    participants: [],

    createdAt: timestamp,

    updatedAt: timestamp,
  };

  return saveVisit(visit);
};

// ==========================================
// SAVE SITE VISIT
// ==========================================

export const saveVisit = (visit) => {
  const updatedVisit = normalizeVisit({
    ...visit,

    updatedAt: new Date().toISOString(),
  });

  localStorage.setItem(
    `${STORAGE_PREFIX}${updatedVisit.id}`,
    JSON.stringify(updatedVisit)
  );

  return updatedVisit;
};

// ==========================================
// GET SITE VISIT
// ==========================================

export const getVisit = (visitId) => {
  if (!isValidId(visitId)) return null;

  const storedVisit = localStorage.getItem(
    `${STORAGE_PREFIX}${visitId}`
  );

  if (!storedVisit) return null;

  let visit;

  try {
    visit = JSON.parse(storedVisit);
  } catch {
    return null;
  }

  if (
    !visit ||
    typeof visit !== "object" ||
    visit.id !== visitId
  ) {
    return null;
  }

  const normalizedVisit = normalizeVisit(visit);

  // Upgrade older visits and retain their new public ID.

  if (
    visit.version !== 3 ||
    !isValidId(visit.publicId)
  ) {
    localStorage.setItem(
      `${STORAGE_PREFIX}${visitId}`,
      JSON.stringify(normalizedVisit)
    );
  }

  return normalizedVisit;
};

// ==========================================
// FIND LOCAL VISIT BY PUBLIC ID
// ==========================================

export const getVisitByPublicId = (publicId) => {
  if (!isValidId(publicId)) return null;

  for (
    let index = 0;
    index < localStorage.length;
    index++
  ) {
    const key = localStorage.key(index);

    if (
      !key ||
      !key.startsWith(STORAGE_PREFIX)
    ) {
      continue;
    }

    const visitId = key.slice(
      STORAGE_PREFIX.length
    );

    const visit = getVisit(visitId);

    if (visit?.publicId === publicId) {
      return visit;
    }
  }

  return null;
};

// ==========================================
// VALIDATE REGISTRATION DETAILS
// ==========================================

const createParticipant = (data) => {
  const fullName = formatText(data.fullName);

  const phone = normalizePhone(data.phone);

  const comingFrom = formatText(
    data.comingFrom
  );

  const numberOfPeople = Number(
    data.numberOfPeople
  );

  if (!fullName || fullName.length > 100) {
    throw new Error(
      "Enter a valid full name."
    );
  }

  if (!phone) {
    throw new Error(
      "Enter a valid 10-digit mobile number starting with 06 or 07."
    );
  }

  if (!comingFrom || comingFrom.length > 100) {
    throw new Error(
      "Enter where you are coming from."
    );
  }

  if (
    !Number.isSafeInteger(numberOfPeople) ||
    numberOfPeople < 1
  ) {
    throw new Error(
      "Enter a valid number of people."
    );
  }

  return {
    id: generateId(),

    fullName,

    phone,

    comingFrom,

    numberOfPeople,

    status: PARTICIPANT_STATUS.REGISTERED,

    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// GET LOCALLY SAVED REGISTRATIONS
// ==========================================

export const getLocalRegistrations = (publicId) => {
  if (!isValidId(publicId)) return [];

  const stored = localStorage.getItem(
    `${REGISTRATION_PREFIX}${publicId}`
  );

  if (!stored) return [];

  let registrations;

  try {
    registrations = JSON.parse(stored);
  } catch {
    throw new Error(
      "Unable to read saved registrations."
    );
  }

  if (!Array.isArray(registrations)) {
    throw new Error(
      "Invalid saved registration data."
    );
  }

  return registrations;
};

// ==========================================
// PREVENT DUPLICATE REGISTRATION
// ==========================================

const hasDuplicatePhone = (
  participants,
  phone
) => {
  return participants.some(
    (participant) =>
      normalizePhone(participant.phone) === phone
  );
};

// ==========================================
// PUBLIC PARTICIPANT REGISTRATION
// ==========================================

export const registerParticipant = (
  publicId,
  data
) => {
  if (!isValidId(publicId)) {
    throw new Error(
      "Invalid registration link."
    );
  }

  const participant = createParticipant(data);

  const localVisit = getVisitByPublicId(
    publicId
  );

  const localRegistrations =
    getLocalRegistrations(publicId);

  // Prevent duplicate registrations on this browser.

  if (
    hasDuplicatePhone(
      localRegistrations,
      participant.phone
    )
  ) {
    throw new Error(
      "This phone number is already registered."
    );
  }

  // ========================================
  // SAME-BROWSER REGISTRATION
  // ========================================

  if (localVisit) {
    if (localVisit.status !== "OPEN") {
      throw new Error(
        "Registration for this visit is closed."
      );
    }

    if (
      hasDuplicatePhone(
        localVisit.participants,
        participant.phone
      )
    ) {
      throw new Error(
        "This phone number is already registered."
      );
    }

    const registeredPeople =
      localVisit.participants.reduce(
        (total, record) =>
          total + Number(record.numberOfPeople),
        0
      );

    if (
      !Number.isSafeInteger(
        registeredPeople +
          participant.numberOfPeople
      )
    ) {
      throw new Error(
        "Invalid number of people."
      );
    }

    saveVisit({
      ...localVisit,

      participants: [
        ...localVisit.participants,
        participant,
      ],
    });

    return {
      participant,

      connectedToWorkspace: true,
    };
  }

  // ========================================
  // OTHER-BROWSER DEMO REGISTRATION
  // ========================================

  const updatedRegistrations = [
    ...localRegistrations,
    participant,
  ];

  localStorage.setItem(
    `${REGISTRATION_PREFIX}${publicId}`,
    JSON.stringify(updatedRegistrations)
  );

  return {
    participant,

    connectedToWorkspace: false,
  };
};