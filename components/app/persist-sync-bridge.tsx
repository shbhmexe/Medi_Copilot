"use client";

import { useEffect } from "react";
import {
  useAuthStore,
  useDoctorInboxStore,
  usePatientPortalStore,
  usePatientStore,
} from "@/store";

const PERSISTED_KEYS = new Set([
  "medcopilot-auth",
  "medcopilot-patients",
  "medcopilot-doctor-inbox",
  "medcopilot-patient-portal",
]);

function rehydratePersistedStores() {
  void useAuthStore.persist.rehydrate();
  void usePatientStore.persist.rehydrate();
  void useDoctorInboxStore.persist.rehydrate();
  void usePatientPortalStore.persist.rehydrate();
}

export function PersistSyncBridge() {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key && !PERSISTED_KEYS.has(event.key)) return;
      rehydratePersistedStores();
    };

    const handleWindowFocus = () => {
      rehydratePersistedStores();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        rehydratePersistedStores();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
