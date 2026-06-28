import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { Request } from "express";

type UploadedFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

function decodeHeaderValue(value: string) {
  return Buffer.from(value, "latin1").toString("utf8");
}

function decodeRfc5987Value(value: string) {
  const match = value.match(/^([^']*)''(.+)$/);
  if (!match) return decodeHeaderValue(value);

  try {
    return decodeURIComponent(match[2]);
  } catch {
    return decodeHeaderValue(match[2]);
  }
}

function filenameFromDisposition(disposition: string) {
  const encodedFilename = disposition.match(/filename\*=([^;]+)/i)?.[1]?.trim().replace(/^"|"$/g, "");
  if (encodedFilename) {
    return decodeRfc5987Value(encodedFilename);
  }

  const filename = disposition.match(/filename="([^"]+)"/)?.[1];
  return filename ? decodeHeaderValue(filename) : "upload";
}

export async function readSingleFileUpload(
  req: Request,
  fieldName: string,
  maxBytes: number
): Promise<UploadedFile | null> {
  const contentType = req.headers["content-type"] ?? "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;

  const boundary = `--${boundaryMatch[1] ?? boundaryMatch[2]}`;
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const nextChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += nextChunk.length;
    if (totalBytes > maxBytes) {
      throw Object.assign(new Error("Uploaded file is too large"), { status: 413 });
    }
    chunks.push(nextChunk);
  }

  const body = Buffer.concat(chunks).toString("latin1");
  for (const rawPart of body.split(boundary)) {
    const part = rawPart.replace(/^\r\n/, "").replace(/\r\n$/, "");
    if (!part || part === "--") continue;

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const rawHeaders = part.slice(0, headerEnd);
    const rawData = part.slice(headerEnd + 4).replace(/\r\n--$/, "");
    const disposition = rawHeaders.match(/content-disposition:\s*form-data;[^\r\n]*/i)?.[0] ?? "";
    if (!new RegExp(`name="${fieldName}"`).test(disposition)) continue;

    const filename = filenameFromDisposition(disposition);
    const mimeType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() ?? "";
    const data = Buffer.from(rawData, "latin1");

    return {
      data,
      filename,
      mimeType,
      size: data.length
    };
  }

  return null;
}

export async function saveUploadedFile(
  upload: UploadedFile,
  directory: string,
  filename: string
) {
  const uploadDir = resolve(process.cwd(), "uploads", directory);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(resolve(uploadDir, filename), upload.data);
  return `/uploads/${directory}/${filename}`;
}

export function pickSafeExtension(filename: string, mimeType: string, mimeExtensions: Record<string, string>) {
  const fallbackExtension = mimeExtensions[mimeType] ?? ".bin";
  const originalExtension = extname(filename).toLowerCase();
  return Object.values(mimeExtensions).includes(originalExtension) ? originalExtension : fallbackExtension;
}
