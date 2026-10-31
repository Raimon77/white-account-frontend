import assert from "node:assert/strict";
import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "src-tauri/icons/android");
const destination = path.join(root, "src-tauri/gen/android/app/src/main/res");

assert.ok((await stat(destination)).isDirectory(), "Générez le projet avec npm run android:init avant d'appliquer les icônes.");

let count = 0;
async function copyIcons(relative = "") {
  for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      await mkdir(path.join(destination, name), { recursive: true });
      await copyIcons(name);
    } else {
      await copyFile(path.join(source, name), path.join(destination, name));
      assert.deepEqual(await readFile(path.join(destination, name)), await readFile(path.join(source, name)));
      count += 1;
    }
  }
}

await copyIcons();
console.log(`${count} ressources d'icône White Account appliquées et vérifiées dans le projet Android.`);
