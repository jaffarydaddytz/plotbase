import cloudinary from "../config/cloudinary.js";

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "png"]);

export const getCompanyDocumentUrl = (storageKey) => {
  if (
    typeof storageKey !== "string" ||
    !storageKey.startsWith("plotbase/company-verification/")
  ) {
    throw new Error("Invalid company document reference");
  }

  const extension = storageKey.split(".").pop()?.toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported company document format");
  }

  // URL expires after 60 seconds
  const expiresAt = Math.floor(Date.now() / 1000) + 60;

  return cloudinary.utils.private_download_url(
    storageKey,
    extension,
    {
      resource_type: "raw",
      type: "authenticated",
      expires_at: expiresAt,
      attachment: false,
    }
  );
};