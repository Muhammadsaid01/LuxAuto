import { RequestHandler } from "express";
import { writeFile } from "fs/promises";
import multer from "multer";
import path from "path";
import { v4 } from "uuid";

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const formatMessage = "Only images with jpeg, jpg, png format allowed!";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, done) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = (file.mimetype === "image/png" && extension === ".png") ||
      (["image/jpeg", "image/jpg"].includes(file.mimetype) && [".jpg", ".jpeg"].includes(extension));
    if (allowed) done(null, true);
    else done(new Error(formatMessage));
  },
}).single("memberImage");

// Buffer only the bounded profile image. Rejected files never reach disk or the member record.
const profileImageUpload: RequestHandler = (req, res, next) => {
  upload(req, res, async error => {
    if (error) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "Profile image must be 5 MiB or smaller." :
        error.code === "LIMIT_UNEXPECTED_FILE" || error.code === "LIMIT_FILE_COUNT" ? "Upload one profile image at a time." :
        error.message === formatMessage ? formatMessage : "Invalid profile image upload.";
      res.status(400).json({ message });
      return;
    }
    if (!req.file) return next();
    const file = req.file;
    const png = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = file.buffer.length >= 3 && file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255;
    if ((file.mimetype === "image/png" && !png) || (file.mimetype !== "image/png" && !jpeg)) {
      res.status(400).json({ message: "The selected file is not a valid JPEG or PNG image." });
      return;
    }
    file.filename = `${v4()}${png ? ".png" : ".jpg"}`;
    file.path = `uploads/members/${file.filename}`;
    try {
      await writeFile(file.path, file.buffer, { flag: "wx" });
      next();
    } catch {
      res.status(500).json({ message: "Profile image could not be saved. Please try again." });
    }
  });
};
export default profileImageUpload;
