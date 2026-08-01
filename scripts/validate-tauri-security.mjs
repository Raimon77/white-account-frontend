import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configUrl = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));
const { csp, devCsp } = config.app.security;

assert.ok(csp && typeof csp === "object", "La CSP de production doit être activée.");
assert.ok(devCsp && typeof devCsp === "object", "La CSP de développement doit être séparée.");
assert.match(csp["connect-src"], /https:\/\/white-account-backend\.onrender\.com/);
assert.doesNotMatch(
  csp["connect-src"],
  /(?:^|\s)https?:\/\/(?:localhost|127\.0\.0\.1)(?=[:/\s]|$)|\*/
);
assert.doesNotMatch(csp["script-src"], /unsafe-inline|unsafe-eval|\*/);
assert.equal(csp["object-src"], "'none'");

console.log("Configuration de sécurité Tauri validée.");
