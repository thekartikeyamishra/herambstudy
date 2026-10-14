"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyWorkspace,
  loadWorkspace,
  saveErrorMessage,
  saveWorkspace,
  WORKSPACE_KEY,
  type Workspace,
} from "@/lib/client/workspace";

export type WorkspaceStatus = "loading" | "ready" | "unavailable" | "corrupt";

/** Loads the local workspace after mount and persists every update. */
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace());
  const [status, setStatus] = useState<WorkspaceStatus>("loading");

  useEffect(() => {
    const r = loadWorkspace();
    setWorkspace(r.workspace);
    setStatus(r.ok ? "ready" : r.reason);
    // Keep several open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== WORKSPACE_KEY) return;
      const next = loadWorkspace();
      if (next.ok) setWorkspace(next.workspace);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Applies a change; returns an error message if it could not be saved (state is unchanged then). */
  const update = useCallback(
    (fn: (ws: Workspace) => Workspace): string | null => {
      const next = fn(workspace);
      const r = saveWorkspace(next);
      if (!r.ok) return saveErrorMessage(r.reason);
      setWorkspace(next);
      if (status === "corrupt") setStatus("ready");
      return null;
    },
    [workspace, status],
  );

  return { workspace, status, update };
}
