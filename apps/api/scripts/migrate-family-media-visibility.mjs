import { readFileSync } from "fs";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { Client } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = join(__dirname, "../.env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional; fall back to defaults below
  }
}

loadEnv();

const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "muakhah",
});

async function tableExists(tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function loadS3Config() {
  if (!(await tableExists("s3_config"))) return null;
  const result = await client.query(
    `SELECT access_key_id, secret_access_key, region, bucket
     FROM s3_config
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  return result.rows[0] ?? null;
}

async function blurImageBuffer(buffer) {
  return sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .blur(20)
    .jpeg({ quality: 60 })
    .toBuffer();
}

async function blurVideoPosterBuffer(buffer) {
  const tmpDir = await mkdtemp(join(tmpdir(), "family-media-backfill-"));
  const inputPath = join(tmpDir, `input-${randomUUID()}.mp4`);
  const frameFilename = `frame-${randomUUID()}.jpg`;
  const framePath = join(tmpDir, frameFilename);
  try {
    await writeFile(inputPath, buffer);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .on("end", () => resolve())
        .on("error", (error) => reject(error))
        .screenshots({
          timestamps: ["10%"],
          filename: basename(frameFilename),
          folder: tmpDir,
          size: "400x?",
        });
    });
    const frameBuffer = await readFile(framePath);
    return blurImageBuffer(frameBuffer);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function regenerateBlurredUrl(s3, item, familyId) {
  const response = await fetch(item.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${item.url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const blurredBuffer =
    item.kind === "image"
      ? await blurImageBuffer(buffer)
      : await blurVideoPosterBuffer(buffer);

  const blurredKey = `families/${familyId}/blurred/${randomUUID()}.jpg`;
  await s3.client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: blurredKey,
      Body: blurredBuffer,
      ContentType: "image/jpeg",
    }),
  );
  return `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${blurredKey}`;
}

async function migrateFamilyMediaVisibility() {
  if (!(await tableExists("families"))) {
    console.log("families table not found; skipping media visibility migration");
    return;
  }

  const s3Config = await loadS3Config();
  const s3 = s3Config
    ? {
        client: new S3Client({
          region: s3Config.region,
          credentials: {
            accessKeyId: s3Config.access_key_id,
            secretAccessKey: s3Config.secret_access_key,
          },
        }),
        bucket: s3Config.bucket,
        region: s3Config.region,
      }
    : null;

  if (!s3) {
    console.warn(
      "No S3 config found; will default isSensitive but skip blurred-thumbnail backfill",
    );
  }

  const { rows } = await client.query(
    `SELECT id, media_items FROM families WHERE jsonb_array_length(media_items) > 0`,
  );

  console.log(`Found ${rows.length} families with media to check`);

  let updatedFamilies = 0;
  let regenerated = 0;
  let regenerationFailures = 0;

  for (const row of rows) {
    const items = row.media_items ?? [];
    let changed = false;

    for (const item of items) {
      if (typeof item.isSensitive !== "boolean") {
        item.isSensitive = false;
        changed = true;
      }
      if (!item.blurredUrl) {
        item.blurredUrl = null;
        changed = true;
        if (s3) {
          try {
            item.blurredUrl = await regenerateBlurredUrl(s3, item, row.id);
            regenerated += 1;
          } catch (error) {
            regenerationFailures += 1;
            console.warn(
              `Could not regenerate blurred thumbnail for family ${row.id} item ${item.url}: ${
                error instanceof Error ? error.message : error
              }`,
            );
          }
        }
      }
    }

    if (changed) {
      await client.query(`UPDATE families SET media_items = $1 WHERE id = $2`, [
        JSON.stringify(items),
        row.id,
      ]);
      updatedFamilies += 1;
    }
  }

  console.log(
    `Media visibility migration complete: ${updatedFamilies} families updated, ${regenerated} thumbnails regenerated, ${regenerationFailures} regeneration failures (left as null, frontend falls back to a placeholder)`,
  );
}

try {
  await client.connect();
  await migrateFamilyMediaVisibility();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
