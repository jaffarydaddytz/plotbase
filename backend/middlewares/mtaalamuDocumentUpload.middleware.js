import multer from "multer";
import path from "node:path";

// Maximum upload size: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Supported knowledge document types
const allowedFileTypes = {
  ".pdf": ["application/pdf"],

  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  ".txt": [
    "text/plain",
    "application/octet-stream",
  ],

  ".md": [
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/octet-stream",
  ],
};

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

const mtaalamuDocumentUpload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const allowedMimeTypes = allowedFileTypes[extension];

    // Validate extension and declared MIME type
    if (
      !allowedMimeTypes ||
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      return callback(
        new Error(
          "Unsupported document. Only PDF, DOCX, TXT and MD files are allowed."
        )
      );
    }

    callback(null, true);
  },
});

export default mtaalamuDocumentUpload;