"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DISCOVERY_PREFERENCES_STORAGE_KEY,
  emptyDiscoveryPreferences,
  mergeDiscoveryPreferences,
  parseDiscoveryPreferences,
  recordBusinessView,
  recordCategoryPreference,
  recordLocationPreference,
  recordSearch,
  type DiscoveryPreferences,
  type PreferenceLocation,
} from "@/lib/discovery-preferences";

type SyncStatus = "checking" | "anonymous" | "signed-in" | "error";

type DiscoveryPreferencesContextValue = {
  preferences: DiscoveryPreferences;
  ready: boolean;
  syncStatus: SyncStatus;
  storageError: string | null;
  syncError: string | null;
  saveSearch: (search: {
    query: string;
    category: string;
    location: PreferenceLocation | null;
  }) => void;
  saveCategory: (category: string) => void;
  saveLocation: (location: PreferenceLocation) => void;
  saveBusinessView: (business: {
    id: string;
    slug: string;
    name: string;
    category: string;
    city: string;
    area: string;
  }) => void;
  retrySync: () => Promise<void>;
};

const DiscoveryPreferencesContext = createContext<DiscoveryPreferencesContextValue | null>(null);

async function putPreferences(preferences: DiscoveryPreferences) {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (response.status === 401) throw new Error("Your sign-in has expired. Preferences remain saved on this device.");
  if (!response.ok) throw new Error(`Preference sync failed (${response.status}).`);
}

export function DiscoveryPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(emptyDiscoveryPreferences);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("checking");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const preferencesRef = useRef(preferences);
  const syncStatusRef = useRef<SyncStatus>("checking");
  const syncQueueRef = useRef(Promise.resolve());

  const setStatus = useCallback((status: SyncStatus) => {
    syncStatusRef.current = status;
    setSyncStatus(status);
  }, []);

  const persistLocal = useCallback((next: DiscoveryPreferences) => {
    try {
      window.localStorage.setItem(DISCOVERY_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      setStorageError(null);
    } catch {
      setStorageError("Browser storage is unavailable. Personalization will last only for this visit.");
    }
  }, []);

  const scheduleRemoteSync = useCallback(() => {
    if (syncStatusRef.current !== "signed-in") return;
    syncQueueRef.current = syncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await putPreferences(preferencesRef.current);
          setSyncError(null);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Preference sync failed.";
          if (message.startsWith("Your sign-in has expired.")) setStatus("anonymous");
          setSyncError(message);
        }
      });
  }, [setStatus]);

  const replacePreferences = useCallback((next: DiscoveryPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    persistLocal(next);
  }, [persistLocal]);

  const retrySync = useCallback(async () => {
    setSyncError(null);
    setStatus("checking");
    try {
      const response = await fetch("/api/preferences", { cache: "no-store" });
      if (response.status === 401) {
        setStatus("anonymous");
        return;
      }
      if (!response.ok) throw new Error(`Preference sync failed (${response.status}).`);
      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null || !("authenticated" in payload)) {
        throw new Error("The preference sync response is invalid.");
      }
      if (payload.authenticated === false) {
        setStatus("anonymous");
        return;
      }
      if (payload.authenticated !== true || !("preferences" in payload)) {
        throw new Error("The preference sync response is invalid.");
      }
      const remote = parseDiscoveryPreferences(payload.preferences);
      if (!remote) throw new Error("The preference sync response contains invalid data.");
      setStatus("signed-in");
      const merged = mergeDiscoveryPreferences(preferencesRef.current, remote);
      replacePreferences(merged);
      await putPreferences(merged);
    } catch (error) {
      setStatus("error");
      setSyncError(error instanceof Error ? error.message : "Preference sync failed.");
    }
  }, [replacePreferences, setStatus]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      let local = emptyDiscoveryPreferences();
      try {
        const raw = window.localStorage.getItem(DISCOVERY_PREFERENCES_STORAGE_KEY);
        if (raw) {
          const parsed = parseDiscoveryPreferences(JSON.parse(raw));
          if (!parsed) throw new Error("Saved personalization data is invalid.");
          local = parsed;
        }
      } catch (error) {
        setStorageError(
          error instanceof Error
            ? `${error.message} New preferences will replace it when saved.`
            : "Browser storage could not be read.",
        );
      }

      if (!active) return;
      preferencesRef.current = local;
      setPreferences(local);

      try {
        const response = await fetch("/api/preferences", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          setStatus("anonymous");
          setReady(true);
          return;
        }
        if (!response.ok) throw new Error(`Preference sync failed (${response.status}).`);
        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null || !("authenticated" in payload)) {
          throw new Error("The preference sync response is invalid.");
        }
        if (payload.authenticated === false) {
          setStatus("anonymous");
          setReady(true);
          return;
        }
        if (payload.authenticated !== true || !("preferences" in payload)) {
          throw new Error("The preference sync response is invalid.");
        }
        const remote = parseDiscoveryPreferences(payload.preferences);
        if (!remote) throw new Error("The preference sync response contains invalid data.");
        setStatus("signed-in");
        const merged = mergeDiscoveryPreferences(preferencesRef.current, remote);
        replacePreferences(merged);
        await putPreferences(merged);
      } catch (error) {
        if (active) {
          setStatus("error");
          setSyncError(error instanceof Error ? error.message : "Preference sync failed.");
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [replacePreferences, setStatus]);

  const update = useCallback((transform: (current: DiscoveryPreferences) => DiscoveryPreferences) => {
    const next = transform(preferencesRef.current);
    replacePreferences(next);
    scheduleRemoteSync();
  }, [replacePreferences, scheduleRemoteSync]);

  const saveSearch = useCallback(
    (search: { query: string; category: string; location: PreferenceLocation | null }) =>
      update((current) => recordSearch(current, search)),
    [update],
  );
  const saveCategory = useCallback(
    (category: string) => update((current) => recordCategoryPreference(current, category)),
    [update],
  );
  const saveLocation = useCallback(
    (location: PreferenceLocation) => update((current) => recordLocationPreference(current, location)),
    [update],
  );
  const saveBusinessView = useCallback(
    (business: {
      id: string;
      slug: string;
      name: string;
      category: string;
      city: string;
      area: string;
    }) => update((current) => recordBusinessView(current, business)),
    [update],
  );
  const value = useMemo<DiscoveryPreferencesContextValue>(() => ({
    preferences,
    ready,
    syncStatus,
    storageError,
    syncError,
    saveSearch,
    saveCategory,
    saveLocation,
    saveBusinessView,
    retrySync,
  }), [
    preferences,
    ready,
    syncStatus,
    storageError,
    syncError,
    saveSearch,
    saveCategory,
    saveLocation,
    saveBusinessView,
    retrySync,
  ]);

  return (
    <DiscoveryPreferencesContext.Provider value={value}>
      {children}
    </DiscoveryPreferencesContext.Provider>
  );
}

export function useDiscoveryPreferences() {
  const context = useContext(DiscoveryPreferencesContext);
  if (!context) throw new Error("useDiscoveryPreferences must be used within its provider.");
  return context;
}

export function DiscoveryPreferencesStatus() {
  const { ready, syncStatus, storageError, syncError, retrySync } = useDiscoveryPreferences();

  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
        storageError || syncError
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
      role="status"
      aria-live="polite"
    >
      {storageError && <p>{storageError}</p>}
      {syncError ? (
        <div>
          <p>{syncError}</p>
          {syncStatus !== "anonymous" && (
            <button className="mt-1 font-semibold underline" onClick={() => void retrySync()}>
              Retry sync
            </button>
          )}
        </div>
      ) : syncStatus === "checking" ? (
        <p>Loading your saved preferences…</p>
      ) : syncStatus === "anonymous" && ready ? (
        <p>Preferences stay on this device until you sign in. Precise device coordinates are never saved.</p>
      ) : syncStatus === "signed-in" ? (
        <p>Preferences sync to your account. Precise device coordinates are never saved.</p>
      ) : null}
    </div>
  );
}
