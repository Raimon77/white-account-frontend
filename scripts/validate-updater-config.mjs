import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tauriConfig = JSON.parse(
  await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8")
);
const releaseWorkflow = await readFile(
  new URL("../.github/workflows/release.yml", import.meta.url),
  "utf8"
);
const capabilities = JSON.parse(
  await readFile(
    new URL("../src-tauri/capabilities/default.json", import.meta.url),
    "utf8"
  )
);

const endpoints = tauriConfig.plugins?.updater?.endpoints;

assert.deepEqual(endpoints, [
  "https://raw.githubusercontent.com/Raimon77/white-account-updates/main/latest.json",
]);
assert.match(releaseWorkflow, /repository: Raimon77\/white-account-updates/);
assert.match(releaseWorkflow, /ssh-key: \$\{\{ secrets\.UPDATES_DEPLOY_KEY \}\}/);
assert.match(releaseWorkflow, /public-assets\/latest\.json/);
assert.doesNotMatch(
  endpoints[0],
  /white-account-frontend\/releases/,
  "Le dépôt privé ne doit jamais être utilisé comme endpoint public."
);
assert.ok(capabilities.permissions.includes("updater:default"));
assert.ok(capabilities.permissions.includes("dialog:allow-message"));
assert.ok(capabilities.permissions.includes("process:allow-restart"));

console.log("Configuration publique de l'updater validée.");
