/**
 * Apply public-read ACL to all existing objects in the Tigris S3 bucket.
 *
 * Objects uploaded before ACL: "public-read" was added to PutObjectCommand
 * are private. This script iterates every object and grants public-read,
 * making them accessible via direct URL.
 *
 * Run:  npx tsx --env-file=.env scripts/make-objects-public.ts
 *
 * Safe to re-run (idempotent — applying public-read twice is harmless).
 */
import {
  ListObjectsV2Command,
  PutObjectAclCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const s3 = new S3Client({
    region: getEnv("AWS_REGION"),
    endpoint: getEnv("AWS_ENDPOINT_URL_S3"),
    credentials: {
      accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: false,
  });

  const bucket = getEnv("S3_BUCKET_NAME");
  console.log(`Making all objects in bucket "${bucket}" public-read…\n`);

  let total = 0;
  let failed = 0;
  let continuationToken: string | undefined;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );

    const keys = (list.Contents ?? []).map((o) => o.Key!).filter(Boolean);

    await Promise.all(
      keys.map(async (key) => {
        try {
          await s3.send(
            new PutObjectAclCommand({
              Bucket: bucket,
              Key: key,
              ACL: "public-read",
            })
          );
          total++;
          if (total % 50 === 0) {
            process.stdout.write(`  ${total} objects updated…\r`);
          }
        } catch (err) {
          console.error(`  FAILED: ${key} —`, (err as Error).message);
          failed++;
        }
      })
    );

    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;
  } while (continuationToken);

  console.log(`\nDone. ${total} objects set to public-read, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
