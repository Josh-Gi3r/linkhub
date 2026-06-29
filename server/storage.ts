/**
 * Storage adapter — direct AWS S3 (or S3-compatible: Cloudflare R2, MinIO, Backblaze B2).
 *
 * Required env vars:
 *   S3_BUCKET             — bucket name
 *   S3_REGION             — AWS region (default: us-east-1)
 *   S3_ACCESS_KEY_ID      — access key
 *   S3_SECRET_ACCESS_KEY  — secret key
 *
 * Optional:
 *   S3_ENDPOINT           — custom endpoint for non-AWS providers
 *                           (R2: https://<account>.r2.cloudflarestorage.com)
 *   S3_PUBLIC_URL         — CDN/public base URL (https://cdn.example.com).
 *                           If set, returned URLs use this prefix instead of presigned URLs.
 *
 * Swap adapter: replace this file with any implementation exporting the same
 * storagePut / storageGet signatures.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getClient(): S3Client {
  const opts: ConstructorParameters<typeof S3Client>[0] = {
    region: ENV.s3Region || "us-east-1",
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretKey,
    },
  };
  if (ENV.s3Endpoint) {
    opts.endpoint = ENV.s3Endpoint;
    opts.forcePathStyle = true; // required for MinIO / R2 / Backblaze
  }
  return new S3Client(opts);
}

function getBucket(): string {
  if (!ENV.s3Bucket) throw new Error("S3_BUCKET is not configured. Set S3_BUCKET in your .env.");
  return ENV.s3Bucket;
}

function cdnUrl(key: string): string {
  const base = (ENV.s3PublicUrl || "").replace(/\/+$/, "");
  return base ? `${base}/${key}` : "";
}

/**
 * Upload a file to S3.
 * Returns the CDN URL (if S3_PUBLIC_URL is set) or a 1-hour presigned URL.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getClient();
  const bucket = getBucket();
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );

  const pub = cdnUrl(key);
  if (pub) return { key, url: pub };

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}

/**
 * Get a read URL for an existing S3 object.
 * Returns CDN URL (if S3_PUBLIC_URL is set) or a 1-hour presigned URL.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getClient();
  const bucket = getBucket();
  const key = relKey.replace(/^\/+/, "");

  const pub = cdnUrl(key);
  if (pub) return { key, url: pub };

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}
