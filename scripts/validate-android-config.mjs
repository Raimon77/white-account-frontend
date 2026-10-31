import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const android = await readJson("../src-tauri/tauri.android.conf.json");
const desktop = await readJson("../src-tauri/capabilities/default.json");
const capability = await readJson("../src-tauri/capabilities/android.json");

assert.equal(android.identifier, "com.whiteaccount.mobile");
assert.equal(android.bundle.createUpdaterArtifacts, false);
assert.equal(android.bundle.android.minSdkVersion, 24);
assert.equal(android.bundle.android.debugApplicationIdSuffix, ".debug");
assert.deepEqual(capability.platforms, ["android"]);
assert.ok(!desktop.platforms.includes("android"));
assert.ok(!capability.permissions.some((permission) => /^(updater|process):/.test(permission)));
assert.ok(capability.permissions.includes("shell:allow-open"));
assert.match(android.app.security.devCsp["connect-src"], /https:\/\/white-account-backend\.onrender\.com/);
assert.doesNotMatch(android.app.security.devCsp["script-src"], /unsafe-eval|unsafe-inline/);
console.log("Configuration Android validée : API HTTPS, permissions mobiles et mises à jour PC séparées.");
