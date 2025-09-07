// functions/artistIntro.js
// Storage trigger: transcode/crop intro video to 600x800, ≤20s, mp4+webm+gif+poster
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');
const { randomUUID } = require('node:crypto');

// ---------- Global options (Gen2) ----------
setGlobalOptions({
  region: 'us-central1',
  memory: '2GiB',
  timeoutSeconds: 540,
  maxInstances: 2,
});

// ---------- Init Admin SDK (guarded for emulator/multiple loads) ----------
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

// ---------- Bind trigger to default bucket (project default) ----------
// Use default bucket to avoid cross-project bucket issues during analysis/deploy.

// ---------- Config ----------
const TARGET_W = 600;
const TARGET_H = 800;
const TRIM_SEC = 20;          // max produced duration
const HARD_MAX_SEC = 120;     // reject + (optionally) delete if longer than this
const GIF_FPS = 12;
const WEBM_CRF = 33;          // VP9 quality
const MP4_BITRATE = '2500k';  // ~2.5 Mbps
const DELETE_OVERSIZED_ORIGINAL = true;

// Scale to cover 600x800, then center-crop (no stretching)
const vfCoverCrop =
  `scale=if(gt(a,${TARGET_W}/${TARGET_H}),-1,${TARGET_W}):` +
  `if(gt(a,${TARGET_W}/${TARGET_H}),${TARGET_H},-1),` +
  `crop=${TARGET_W}:${TARGET_H}`;

// Spawn ffmpeg and collect stderr (which has probe info)
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stderr = '';
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('close', code => (code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg failed (${code}): ${stderr}`))));
  });
}

// Probe duration by parsing ffmpeg stderr (no ffprobe needed)
async function probeDuration(localPath) {
  try {
    const stderr = await run(ffmpegPath, ['-i', localPath]);
    const m = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (!m) return NaN;
    const h = parseInt(m[1], 10), mi = parseInt(m[2], 10), s = parseFloat(m[3]);
    return h * 3600 + mi * 60 + s;
  } catch {
    return NaN;
  }
}

// Accept artists/{artistUid}/intro.(mp4|mov|webm); ignore derived outputs
function matchArtistIntro(objectName) {
  if (!objectName) return null;
  const parts = objectName.split('/');
  if (parts.length < 3 || parts[0] !== 'artists') return null;
  const artistUid = parts[1];
  const filename = parts.slice(2).join('/');
  if (!artistUid || !filename) return null;

  // Avoid loops on our outputs
  if (/intro_600x800\.(mp4|webm|gif)$|poster\.jpg$/i.test(filename)) return null;

  const base = path.basename(filename).toLowerCase();
  if (/^intro\.(mp4|mov|webm)$/i.test(base)) return { artistUid, filename };
  return null;
}

function gsDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

// 🔁 NEW NAME HERE
const transcodeArtistIntroV2 = onObjectFinalized(
  async (event) => {
    const obj = event.data;
    if (!obj) return;

    const bucketName = obj.bucket;           // showbat3.firebasestorage.app
    const objectName = obj.name;             // e.g., artists/<uid>/intro.mp4
    const contentType = obj.contentType || '';

    const match = matchArtistIntro(objectName);
    if (!match) return;

    const { artistUid } = match;
    logger.info(`[transcode] start ${objectName} (${contentType}) artistUid=${artistUid}`);

    const bucket = admin.storage().bucket(bucketName);

    // temp workspace
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artist-'));
    const localIn = path.join(tmpDir, path.basename(objectName));
    const localMp4 = path.join(tmpDir, 'intro_600x800.mp4');
    const localWebm = path.join(tmpDir, 'intro_600x800.webm');
    const localGif = path.join(tmpDir, 'intro_600x800.gif');
    const localPoster = path.join(tmpDir, 'poster.jpg');
    const localPalette = path.join(tmpDir, 'palette.png');

    try {
      // Download original
      await bucket.file(objectName).download({ destination: localIn });

      // Hard reject extremely long videos (saves $$ and time)
      const dur = await probeDuration(localIn);
      logger.info(`[transcode] probed duration ~${isNaN(dur) ? 'unknown' : dur.toFixed(2)}s`);
      if (Number.isFinite(dur) && dur > HARD_MAX_SEC) {
        await db.doc(`artists/${artistUid}`).set({
          transcodeStatus: 'error',
          transcodeError: `Video too long (${Math.round(dur)}s). Max allowed: ${HARD_MAX_SEC}s.`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (DELETE_OVERSIZED_ORIGINAL) {
          try { await bucket.file(objectName).delete(); } catch {}
        }
        return;
      }

      const trimArgs = ['-t', String(TRIM_SEC)];

      // ---- MP4 (H.264) ----
      await run(ffmpegPath, [
        '-y', '-i', localIn, ...trimArgs,
        '-vf', vfCoverCrop,
        '-r', '30',
        '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-b:v', MP4_BITRATE, '-maxrate', '3000k', '-bufsize', '5000k',
        '-an',
        localMp4,
      ]);
      logger.info('[transcode] mp4 ready');

      // ---- WebM (VP9) ----
      await run(ffmpegPath, [
        '-y', '-i', localIn, ...trimArgs,
        '-vf', vfCoverCrop,
        '-r', '30',
        '-c:v', 'libvpx-vp9',
        '-b:v', '0', '-crf', String(WEBM_CRF),
        '-row-mt', '1',
        '-an',
        localWebm,
      ]);
      logger.info('[transcode] webm ready');

      // ---- GIF (palette-optimized, 12 fps) ----
      // 1) palette
      await run(ffmpegPath, [
        '-y', '-i', localIn, ...trimArgs,
        '-vf', `${vfCoverCrop},fps=${GIF_FPS},palettegen=stats_mode=diff`,
        localPalette,
      ]);
      // 2) gif with palette
      await run(ffmpegPath, [
        '-y', '-i', localIn, '-i', localPalette, ...trimArgs,
        '-lavfi', `${vfCoverCrop},fps=${GIF_FPS} [x]; [x][1:v] paletteuse=dither=sierra2_4a:new=1`,
        '-loop', '0',
        '-an',
        localGif,
      ]);
      logger.info('[transcode] gif ready');

      // ---- Poster jpg ----
      await run(ffmpegPath, [
        '-y', '-ss', '0.1', '-i', localIn,
        '-vf', vfCoverCrop,
        '-vframes', '1',
        localPoster,
      ]);
      logger.info('[transcode] poster ready');

      // Upload derived files with tokenized public URLs
      const tokenMp4 = randomUUID();
      const tokenWebm = randomUUID();
      const tokenGif = randomUUID();
      const tokenPoster = randomUUID();

      const [mp4File, webmFile, gifFile, posterFile] = await Promise.all([
        bucket.upload(localMp4, {
          destination: `artists/${artistUid}/intro_600x800.mp4`,
          metadata: {
            contentType: 'video/mp4',
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: tokenMp4 },
          },
        }),
        bucket.upload(localWebm, {
          destination: `artists/${artistUid}/intro_600x800.webm`,
          metadata: {
            contentType: 'video/webm',
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: tokenWebm },
          },
        }),
        bucket.upload(localGif, {
          destination: `artists/${artistUid}/intro_600x800.gif`,
          metadata: {
            contentType: 'image/gif',
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: tokenGif },
          },
        }),
        bucket.upload(localPoster, {
          destination: `artists/${artistUid}/poster.jpg`,
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: tokenPoster },
          },
        }),
      ]);

      const videoURL  = gsDownloadUrl(bucketName, mp4File[0].name, tokenMp4);
      const webmURL   = gsDownloadUrl(bucketName, webmFile[0].name, tokenWebm);
      const gifURL    = gsDownloadUrl(bucketName, gifFile[0].name, tokenGif);
      const posterURL = gsDownloadUrl(bucketName, posterFile[0].name, tokenPoster);

      await db.doc(`artists/${artistUid}`).set({
        video: videoURL,
        videoWebm: webmURL,
        gif: gifURL,
        poster: posterURL,
        img: posterURL, // card compatibility
        transcodeStatus: 'ready',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      logger.info(`[transcode] success for artists/${artistUid}`);
    } catch (err) {
      logger.error('[transcode] failed', err);
      try {
        await db.doc(`artists/${artistUid}`).set({
          transcodeStatus: 'error',
          transcodeError: String(err && err.message ? err.message : err),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch {}
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
);

// 🔁 NEW EXPORT NAME HERE
module.exports = { transcodeArtistIntroV2 };
