import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const out = "public/brand";
await mkdir(out, { recursive: true });

const pilot = "assets/vasity_pilot_logo.jpeg";
const seal = "assets/logo.jpeg";

const pilotMeta = await sharp(pilot).metadata();
const sealMeta = await sharp(seal).metadata();
console.log("varsity pilot", pilotMeta.width, pilotMeta.height);
console.log("department seal", sealMeta.width, sealMeta.height);

// Newspaper masthead (wide Varsity Pilot lockup).
for (const width of [480, 900, 1600]) {
  const target = width < pilotMeta.width ? width : pilotMeta.width;
  await sharp(pilot)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(`${out}/varsity-pilot-${width}.webp`);
}
await sharp(pilot).resize({ width: 1600 }).png().toFile(`${out}/varsity-pilot.png`);

// Department seal used in the footer, press identity and icons.
await sharp(seal)
  .resize({ width: 400, withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(`${out}/department-seal-400.webp`);
await sharp(seal).resize({ width: 1280 }).png().toFile(`${out}/department-seal.png`);

// Favicons / app icons from the department seal.
const size = 512;
const inner = 440;
const sealIcon = await sharp(seal)
  .resize({ width: inner, height: inner, fit: "contain", background: "#ffffff" })
  .png()
  .toBuffer();
await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
  .composite([{ input: sealIcon, gravity: "center" }])
  .png()
  .toFile(`${out}/icon-512.png`);
await sharp(`${out}/icon-512.png`).resize(192, 192).toFile(`${out}/icon-192.png`);
await sharp(`${out}/icon-512.png`).resize(64, 64).toFile(`${out}/icon-64.png`);
await sharp(`${out}/icon-512.png`).resize(32, 32).toFile(`${out}/favicon-32.png`);
await sharp(`${out}/icon-512.png`).resize(180, 180).toFile(`${out}/apple-touch-icon.png`);
await sharp(`${out}/icon-512.png`).resize(32, 32).toFile("src/app/favicon.ico");

// Open Graph / social share card.
const cardLogo = await sharp(pilot)
  .resize({ width: 1000, withoutEnlargement: true })
  .png()
  .toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#ffffff" } })
  .composite([
    { input: cardLogo, gravity: "center" },
    {
      input: Buffer.from(
        `<svg width="1200" height="630"><rect x="0" y="0" width="1200" height="10" fill="#10104f"/><rect x="0" y="620" width="1200" height="10" fill="#c90016"/></svg>`,
      ),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile(`${out}/og-image.png`);

console.log("brand assets written to", out);
