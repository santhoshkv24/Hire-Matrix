const fs = require("fs/promises");
const path = require("path");
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");

const normalizeText = (value) => {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const isPdf = (mimeType, extension) => {
  return mimeType === "application/pdf" || extension === ".pdf";
};

const isDocx = (mimeType, extension) => {
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  );
};

const isLegacyDoc = (mimeType, extension) => {
  return mimeType === "application/msword" || extension === ".doc";
};

const isText = (mimeType, extension) => {
  return mimeType === "text/plain" || extension === ".txt";
};

const readPdfText = async (buffer) => {
  if (typeof pdfParseModule === "function") {
    const parsed = await pdfParseModule(buffer);
    return parsed?.text || "";
  }

  if (typeof pdfParseModule?.default === "function") {
    const parsed = await pdfParseModule.default(buffer);
    return parsed?.text || "";
  }

  if (typeof pdfParseModule?.PDFParse === "function") {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed?.text || "";
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  throw new Error("Unsupported pdf-parse module format");
};

const readDocxText = async (buffer) => {
  const parsed = await mammoth.extractRawText({ buffer });
  return parsed.value || "";
};

const readPlainText = (buffer) => {
  return buffer.toString("utf8");
};

const extractResumeText = async ({ storagePath, mimeType = "", originalName = "" }) => {
  const extension = path.extname(originalName || storagePath || "").toLowerCase();
  const buffer = await fs.readFile(storagePath);

  let extractedText = "";

  if (isPdf(mimeType, extension)) {
    extractedText = await readPdfText(buffer);
  } else if (isDocx(mimeType, extension)) {
    extractedText = await readDocxText(buffer);
  } else if (isText(mimeType, extension)) {
    extractedText = readPlainText(buffer);
  } else if (isLegacyDoc(mimeType, extension)) {
    try {
      extractedText = await readDocxText(buffer);
    } catch (_error) {
      extractedText = readPlainText(buffer).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
    }
  } else {
    throw new Error(`Unsupported resume file type: ${mimeType || extension || "unknown"}`);
  }

  const normalizedText = normalizeText(extractedText);
  if (!normalizedText) {
    throw new Error("No text could be extracted from the uploaded resume");
  }

  return normalizedText;
};

module.exports = {
  extractResumeText,
};
