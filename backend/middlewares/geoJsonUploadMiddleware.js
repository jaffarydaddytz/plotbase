import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

// Maximum upload size: 10 MB.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Resolve the backend directory.
const backendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

// Use writable temporary storage on Vercel.
const destination = process.env.VERCEL
  ? "/tmp"
  : path.join(backendDirectory, "uploads", "geojson");

// Ensure upload directory exists.
fs.mkdirSync(destination, {
  recursive: true,
});

// Generate unique filenames.
const storage = multer.diskStorage({
  destination,

  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}.geojson`);
  },
});

// Validate supported file extensions.
const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowedExtensions = [".geojson", ".json"];

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error(
        "Only GeoJSON (.geojson or .json) files are allowed"
      )
    );
  }

  cb(null, true);
};

const geoJsonUploadMiddleware = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export default geoJsonUploadMiddleware;
