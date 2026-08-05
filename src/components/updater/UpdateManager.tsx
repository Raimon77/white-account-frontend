import { useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

const INITIAL_CHECK_DELAY_MS = 2_500;
const PERIODIC_CHECK_INTERVAL_MS = 30 * 60 * 1_000;
const PENDING_UPDATE_KEY = "white_account_pending_update";
const UPDATE_LOCK_MAX_AGE_MS = 20 * 60 * 1_000;

type PendingUpdate = {
  version: string;
  startedAt: number;
};

function readPendingUpdate(): PendingUpdate | null {
  try {
    const rawValue = localStorage.getItem(PENDING_UPDATE_KEY);
    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as Partial<PendingUpdate>;
    if (!value.version || typeof value.startedAt !== "number") {
      localStorage.removeItem(PENDING_UPDATE_KEY);
      return null;
    }

    return { version: value.version, startedAt: value.startedAt };
  } catch {
    localStorage.removeItem(PENDING_UPDATE_KEY);
    return null;
  }
}

function savePendingUpdate(version: string) {
  localStorage.setItem(
    PENDING_UPDATE_KEY,
    JSON.stringify({ version, startedAt: Date.now() } satisfies PendingUpdate)
  );
}

function clearPendingUpdate() {
  localStorage.removeItem(PENDING_UPDATE_KEY);
}

function UpdateManager() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let checking = false;
    let promptedVersion: string | null = null;
    let errorAlreadyShown = false;

    async function verifyPreviousInstallation() {
      const pendingUpdate = readPendingUpdate();
      if (!pendingUpdate) return;

      const installedVersion = await getVersion();
      clearPendingUpdate();

      if (installedVersion === pendingUpdate.version) {
        await message(
          `White Account ${installedVersion} a été installé avec succès.`,
          { title: "Mise à jour terminée", kind: "info" }
        );
        return;
      }

      await message(
        `L'installation de la version ${pendingUpdate.version} n'a pas abouti. La version ${installedVersion} est toujours installée. Une nouvelle tentative va être proposée.`,
        { title: "Mise à jour incomplète", kind: "warning" }
      );
    }

    async function checkForUpdates() {
      if (disposed || checking) {
        return;
      }

      checking = true;

      try {
        const update = await check({ timeout: 20_000 });

        if (!update || disposed || promptedVersion === update.version) {
          return;
        }

        const pendingUpdate = readPendingUpdate();
        if (
          pendingUpdate?.version === update.version &&
          Date.now() - pendingUpdate.startedAt < UPDATE_LOCK_MAX_AGE_MS
        ) {
          await update.close();
          return;
        }

        if (pendingUpdate) {
          clearPendingUpdate();
        }

        promptedVersion = update.version;

        const shouldInstall = await ask(
          `Une mise à jour vers la version ${update.version} est disponible.\n\nVoulez-vous l'installer maintenant ?`,
          { title: "Mise à jour disponible", kind: "info" }
        );

        if (!shouldInstall) {
          await update.close();
          return;
        }

        await message(
          "Le téléchargement va commencer. L'installation se fera silencieusement et White Account redémarrera automatiquement.",
          { title: "Mise à jour en cours", kind: "info" }
        );
        savePendingUpdate(update.version);
        await update.downloadAndInstall();
        await relaunch();
      } catch (error) {
        console.error("Erreur lors de la vérification des mises à jour :", error);
        clearPendingUpdate();

        if (!disposed && !errorAlreadyShown) {
          errorAlreadyShown = true;
          await message(
            "La vérification automatique des mises à jour a échoué. Vérifiez votre connexion internet, puis relancez White Account.",
            { title: "Mise à jour indisponible", kind: "warning" }
          );
        }
      } finally {
        checking = false;
      }
    }

    const initialTimer = window.setTimeout(() => {
      void verifyPreviousInstallation()
        .catch((error) => {
          console.error("Erreur de vérification post-installation :", error);
          clearPendingUpdate();
        })
        .finally(() => {
          void checkForUpdates();
        });
    }, INITIAL_CHECK_DELAY_MS);
    const periodicTimer = window.setInterval(() => {
      void checkForUpdates();
    }, PERIODIC_CHECK_INTERVAL_MS);
    const checkWhenFocused = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    window.addEventListener("focus", checkWhenFocused);
    document.addEventListener("visibilitychange", checkWhenFocused);

    return () => {
      disposed = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicTimer);
      window.removeEventListener("focus", checkWhenFocused);
      document.removeEventListener("visibilitychange", checkWhenFocused);
    };
  }, []);

  return null;
}

export default UpdateManager;
