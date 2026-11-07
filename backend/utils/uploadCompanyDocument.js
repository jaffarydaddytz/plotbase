import { randomUUID } from "node:crypto";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const detectFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  // PDF
  if (buffer.subarray(0, 5).toString() === "%PDF-") {
    return { mime: "application/pdf", extension: "pdf" };
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  // PNG
  const pngSignature = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature)
  ) {
    return { mime: "image/png", extension: "png" };
  }

  return null;
};

export const uploadCompanyDocument = async (file) => {
  if (!file?.buffer || file.buffer.length === 0) {
    throw new Error("No document provided");
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new Error("Document exceeds the 5 MB limit");
  }

  const detected = detectFileType(file.buffer);

  if (!detected || detected.mime !== file.mimetype) {
    throw new Error("Invalid or unsupported document content");
  }

  // Cloudinary raw assets require a file extension.
  const publicId = `${randomUUID()}.${detected.extension}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "plotbase/company-verification",
        public_id: publicId,
        resource_type: "raw",
        type: "authenticated",
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (
          !result ||
          result.type !== "authenticated" ||
          result.resource_type !== "raw"
        ) {
          return reject(
            new Error("Protected document upload could not be verified")
          );
        }

        resolve({
          storageKey: result.public_id,
          resourceType: result.resource_type,
          deliveryType: result.type,
        });
      }
    );

    stream.on("error", reject);
    stream.end(file.buffer);
  });
};