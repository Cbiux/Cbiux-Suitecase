"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { bakeLogoPlateCached } from "@/lib/logo-fit";
import { localizeInventory } from "@/lib/localize";
import { artworkSpec, getCatalogById } from "@/lib/positions";
import type { ApproachPhase, Face, InventoryResponse, LivePosition } from "@/lib/types";
import { useLanguage } from "./language-provider";

type InventoryContextValue = {
  data: InventoryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  openClaim: (id: number) => void;
  activeFace: Face;
  setActiveFace: (face: Face) => void;
  selected: LivePosition | undefined;
  claimOpen: boolean;
  approachPhase: ApproachPhase;
  facePinned: boolean;
  completeApproach: () => void;
  completeReturn: () => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({
  initial,
  children,
}: {
  initial: InventoryResponse;
  children: React.ReactNode;
}) {
  const { locale } = useLanguage();
  const [raw, setRaw] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);
  const [activeFace, setActiveFaceState] = useState<Face>("front");
  const [facePinned, setFacePinned] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [approachPhase, setApproachPhase] = useState<ApproachPhase>("idle");

  useEffect(() => {
    for (const position of raw.positions) {
      if (!position.logo) continue;
      const spec = artworkSpec(position.size);
      void bakeLogoPlateCached(position.logo, spec.cmW, spec.cmH);
    }
  }, [raw]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/positions?locale=${locale}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("inventory");
      const json = (await response.json()) as InventoryResponse;
      setRaw(json);
      setError(null);
    } catch {
      setError("inventory");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const data = useMemo(() => localizeInventory(raw, locale), [raw, locale]);
  const selected = data.positions.find((p) => p.id === selectedId);

  const setSelectedId = useCallback(
    (id: number | null) => {
      if (id == null) {
        setClaimOpen(false);
        setFacePinned(false);
        if (selectedId == null) {
          setApproachPhase("idle");
          return;
        }
        setApproachPhase("returning");
        return;
      }

      const catalog = getCatalogById(id);
      if (catalog) setActiveFaceState(catalog.face);

      if (typeof document !== "undefined") {
        document.getElementById("suitcase-orbit")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      if (id === selectedId && approachPhase === "focused") {
        setClaimOpen(true);
        return;
      }

      setSelectedIdState(id);
      setFacePinned(false);
      setClaimOpen(false);
      setApproachPhase("approaching");
    },
    [selectedId, approachPhase],
  );

  const openClaim = useCallback((id: number) => {
    const catalog = getCatalogById(id);
    if (catalog) setActiveFaceState(catalog.face);
    setSelectedIdState(id);
    setFacePinned(false);
    setClaimOpen(true);
    setApproachPhase("focused");
  }, []);

  const setActiveFace = useCallback(
    (face: Face) => {
      setActiveFaceState(face);
      setFacePinned(true);
      if (selectedId != null) {
        setClaimOpen(false);
        setApproachPhase("returning");
        return;
      }
      setApproachPhase("idle");
    },
    [selectedId],
  );

  const completeApproach = useCallback(() => {
    setApproachPhase((current) => {
      if (current !== "approaching") return current;
      setClaimOpen(true);
      return "focused";
    });
  }, []);

  const completeReturn = useCallback(() => {
    setSelectedIdState(null);
    setClaimOpen(false);
    setApproachPhase("idle");
  }, []);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      selectedId,
      setSelectedId,
      openClaim,
      activeFace,
      setActiveFace,
      selected,
      claimOpen,
      approachPhase,
      facePinned,
      completeApproach,
      completeReturn,
    }),
    [
      data,
      loading,
      error,
      refresh,
      selectedId,
      setSelectedId,
      openClaim,
      activeFace,
      setActiveFace,
      selected,
      claimOpen,
      approachPhase,
      facePinned,
      completeApproach,
      completeReturn,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
