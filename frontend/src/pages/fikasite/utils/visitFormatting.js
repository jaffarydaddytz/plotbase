// ==========================================
// TEXT FORMATTING
// ==========================================

export const formatText = (value = "") => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

// ==========================================
// PHONE NUMBER NORMALIZATION
// ==========================================

export const normalizePhone = (value = "") => {
  const phone = String(value ?? "")
    .trim()
    .replace(/[\s-]/g, "");

  // Local format: 0785907440

  if (/^0[67]\d{8}$/.test(phone)) {
    return `255${phone.slice(1)}`;
  }

  // International format: +255785907440

  if (/^\+255[67]\d{8}$/.test(phone)) {
    return phone.slice(1);
  }

  // International format without plus sign

  if (/^255[67]\d{8}$/.test(phone)) {
    return phone;
  }

  return null;
};

// ==========================================
// PHONE NUMBER VALIDATION
// ==========================================

export const isValidPhone = (value) => {
  return normalizePhone(value) !== null;
};

// ==========================================
// LOCAL PHONE DISPLAY
// ==========================================

export const formatLocalPhone = (value = "") => {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return String(value ?? "").trim();
  }

  return `0${normalized.slice(3)}`;
};

// ==========================================
// DATE FORMATTING
// ==========================================

export const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

// ==========================================
// TIME FORMATTING
// ==========================================

export const formatTime = (time) => {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return "—";
  }

  return `${time} Hrs`;
};

// ==========================================
// CURRENCY FORMATTING
// ==========================================

export const formatCurrency = (amount) => {
  return `TZS ${Number(amount).toLocaleString("en-GB")}`;
};

// ==========================================
// G & RETURN FEE
// ==========================================

export const formatReturnFee = (amount) => {
  return Number(amount) === 0
    ? "Free"
    : formatCurrency(amount);
};