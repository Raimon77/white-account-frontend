import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

const packageJson = await readJson("../package.json");
const packageLock = await readJson("../package-lock.json");
const tauriConfig = await readJson("../src-tauri/tauri.conf.json");
const cargoToml = await readFile(
  new URL("../src-tauri/Cargo.toml", import.meta.url),
  "utf8"
);
const cargoLock = await readFile(
  new URL("../src-tauri/Cargo.lock", import.meta.url),
  "utf8"
);

const cargoPackageVersion = (content, source) => {
  const match = content.match(
    /(?:^|\n)(?:\[\[?package\]?\]\r?\n)?name = "app"\r?\nversion = "([^"]+)"/
  );
  assert.ok(match, `Version de l'application introuvable dans ${source}.`);
  return match[1];
};

const expectedVersion = packageJson.version;
const versions = {
  "package-lock.json": packageLock.version,
  "package-lock.json (package racine)": packageLock.packages[""].version,
  "src-tauri/tauri.conf.json": tauriConfig.version,
  "src-tauri/Cargo.toml": cargoPackageVersion(cargoToml, "Cargo.toml"),
  "src-tauri/Cargo.lock": cargoPackageVersion(cargoLock, "Cargo.lock"),
};

for (const [source, version] of Object.entries(versions)) {
  assert.equal(
    version,
    expectedVersion,
    `${source} utilise ${version} au lieu de ${expectedVersion}.`
  );
}

console.log(`Versions de publication alignées sur ${expectedVersion}.`);
