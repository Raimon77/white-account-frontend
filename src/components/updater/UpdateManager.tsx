import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

const INITIAL_CHECK_DELAY_MS = 2_500;
const PERIODIC_CHECK_INTERVAL_MS = 30 * 60 * 1_000;

function UpdateManager() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let checking = false;
    let promptedVersion: string | null = null;
    let errorAlreadyShown = false;

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
          "Le téléchargement va commencer. White Account redémarrera automatiquement après l'installation.",
          { title: "Mise à jour en cours", kind: "info" }
        );
        await update.downloadAndInstall();
        await relaunch();
      } catch (error) {
        console.error("Erreur lors de la vérification des mises à jour :", error);

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
      void checkForUpdates();
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
