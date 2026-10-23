/* scripts/x-banner — renders the x-banner prototype to files you can post.

   the capture route records a piece by screen-sharing the tab, which needs a
   hand on it. this is the same frame rendered without one: headless chrome
   draws the profile with a hole where the header goes, ffmpeg drops the loop
   into the hole, and the file comes out the exact size of the frame.

     node scripts/x-banner.mjs [outdir] [dark|light] [web|mobile]

   defaults to out/ and every combination. writes x-banner-<device>-<theme>
   as .mp4 (what x accepts) and .gif (what it does not — which is the whole
   point of the post). */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { frame, styles, FRAMES } from "../src/lab/x-banner.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, process.argv[2] || "out");
const TMP = resolve(OUT, ".tmp");
const MEDIA = resolve(ROOT, "public/media/x");

const FPS = 60;                      // the gif runs at 20 — 60 divides it whole
const THEMES = process.argv[3] ? [process.argv[3]] : ["dark", "light"];
const DEVICES = process.argv[4] ? [process.argv[4]] : ["web", "mobile"];

const CHROME =
  process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const asset = (n) => pathToFileURL(resolve(MEDIA, n)).href;
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

mkdirSync(TMP, { recursive: true });
const made = [];

for (const device of DEVICES) {
  const { w: W, h: H, headerY: HDR_Y, headerH: HDR_H } = FRAMES[device];

  for (const theme of THEMES) {
    const tag = `${device}-${theme}`;

    /* ---- 1. the plate: the profile, with the header left transparent ---- */

    const html =
      `<!doctype html><meta charset="utf-8"><style>` +
      `html,body{margin:0;padding:0;background:transparent}` +
      styles +
      `</style>` +
      frame({ live: false, theme, device })
        .replace(/src="\/media\/x\/([^"]+)"/g, (_, n) => `src="${asset(n)}"`);

    const page = resolve(TMP, `plate-${tag}.html`);
    const plate = resolve(TMP, `plate-${tag}.png`);
    writeFileSync(page, html);

    execFileSync(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",   // so the header hole stays a hole
      `--window-size=${W},${H}`,
      `--screenshot=${plate}`,
      pathToFileURL(page).href,
    ], { stdio: "inherit" });

    /* ---- 2. the composite: loop under plate ----------------------------- */

    const gif = resolve(MEDIA, "banner.gif");
    const mp4 = resolve(OUT, `x-banner-${tag}.mp4`);
    const out = resolve(OUT, `x-banner-${tag}.gif`);

    /* the plate is transparent wherever the page shows through, so the base
       under it is the page colour, not a neutral */
    const base = theme === "light" ? "white" : "black";
    const chain = (fps) =>
      `color=c=${base}:s=${W}x${H}:r=${fps}[bg];` +
      `[0:v]scale=${W}:${HDR_H}:flags=neighbor,fps=${fps}[hdr];` +
      `[bg][hdr]overlay=0:${HDR_Y}:shortest=1[under];` +
      `[under][1:v]overlay=0:0[v]`;

    ff(["-i", gif, "-i", plate, "-filter_complex", chain(60), "-map", "[v]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", mp4]);

    /* the gif is built from the same composite as the mp4, not from the mp4
       itself — one lossy step fewer, and at full frame size rather than the
       half-size thumbnail it used to be.

       20 is the loop's own rate, and gif holds its delays in hundredths of a
       second: 20fps is 5cs exactly, so the timing comes out identical to the
       source rather than rounded. dither=none because the frame is flat
       colour and pixel art, where dithering only adds noise that costs bytes;
       diff_mode=rectangle because everything outside the header is still. */
    ff(["-i", gif, "-i", plate, "-filter_complex",
        chain(20) + ";[v]split[pa][pb];[pa]palettegen=stats_mode=full:max_colors=256[p];" +
        "[pb][p]paletteuse=dither=none:diff_mode=rectangle[o]",
        "-map", "[o]", "-loop", "0", out]);

    made.push(mp4, out);
  }
}

rmSync(TMP, { recursive: true, force: true });
console.log("\n" + made.map((f) => "  " + f).join("\n") + "\n");
