import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configUrl = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));
const { csp, devCsp } = config.app.security;
const updaterPublicKey = Buffer.from(
  config.plugins.updater.pubkey,
  "base64"
).toString("utf8");

assert.ok(csp && typeof csp === "object", "La CSP de production doit être activée.");
assert.ok(devCsp && typeof devCsp === "object", "La CSP de développement doit être séparée.");
assert.match(csp["connect-src"], /https:\/\/white-account-backend\.onrender\.com/);
assert.doesNotMatch(
  csp["connect-src"],
  /(?:^|\s)https?:\/\/(?:localhost|127\.0\.0\.1)(?=[:/\s]|$)|\*/
);
assert.doesNotMatch(csp["script-src"], /unsafe-inline|unsafe-eval|\*/);
assert.equal(csp["object-src"], "'none'");
assert.match(
  updaterPublicKey,
  /^untrusted comment: minisign public key: [A-F0-9]+\r?\nRW[A-Za-z0-9+/=]+\r?\n?$/,
  "La clé publique Tauri doit être encodée une seule fois en Base64."
);

console.log("Configuration de sécurité Tauri validée.");
