import "server-only";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";

const MAX_BUSINESS_PHOTOS = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateBusinessPhotos(files: File[]): string | null {
  if (files.length < 2) return "Upload at least two business photos.";
  if (files.length > MAX_BUSINESS_PHOTOS) return `Upload no more than ${MAX_BUSINESS_PHOTOS} photos.`;
  for (const file of files) {
    if (file.type !== "image/jpeg" || !ALLOWED_IMAGE_TYPES.has(file.type)) {
      return "Upload JPEG photos. Images are safely re-encoded before they reach the marketplace.";
    }
    if (file.size === 0 || file.size > MAX_PHOTO_SIZE) return "Each photo must be smaller than 10 MB.";
  }
  return null;
}

export async function uploadBusinessPhotos(businessId: string, files: File[]) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is not configured.");

  const bucket = getStorage().bucket(bucketName);
  const uploadedPaths: string[] = [];
  try {
    const paths: string[] = [];
    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new Error("One of the uploaded files is not a valid JPEG image.");
      }
      const path = `business-listings/${businessId}/${index + 1}-${randomUUID()}`;
      await bucket.file(path).save(buffer, {
        resumable: false,
        metadata: { contentType: "image/jpeg" },
      });
      uploadedPaths.push(path);
      paths.push(path);
    }
    return { paths };
  } catch (error) {
    const cleanup = await Promise.allSettled(uploadedPaths.map((path) => bucket.file(path).delete()));
    for (const result of cleanup) {
      if (result.status === "rejected") console.error("Failed to remove an incomplete business photo upload", result.reason);
    }
    throw error;
  }
}

export async function removeBusinessPhotos(paths: string[]) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) return;
  const bucket = getStorage().bucket(bucketName);
  const results = await Promise.allSettled(paths.map((path) => bucket.file(path).delete()));
  for (const result of results) {
    if (result.status === "rejected") console.error("Failed to remove business photos after listing creation failed", result.reason);
  }
}
