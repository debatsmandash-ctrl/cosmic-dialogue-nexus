import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualityPreset = "low" | "medium" | "high" | "ultra";
export type FpsCap = 0 | 30 | 60 | 120;

export type MobileLayout = "sheet" | "pills";
export type ViewMode = "3d" | "2d";
export type PlayMode = "shuffle" | "sequential";
export type ThemePalette = "aurora" | "sunset" | "emerald" | "mono";
export type CameraPreset = "free" | "orbit" | "top" | "tour";
export type Sky2DTheme = "mondstadt" | "snezhnaya" | "liyue" | "constellation_pure";
export type ConstellationShape = "figurative" | "free_lines" | "orbit_rings" | "hybrid";
export type StarColorMode = "cluster" | "pure_white" | "rainbow";
export type LobbyStyle = "cinematic" | "hud" | "minimal";

export interface Settings {
  quality: QualityPreset;
  fpsCap: FpsCap;
  showFps: boolean;
  bloomIntensity: number;
  nebulaOpacity: number;
  starSize: number;
  showHoverEdges: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  damping: number;
  audioMuted: boolean;
  audioVolume: number;
  reducedMotion: boolean;
  highContrastLabels: boolean;
  mobileLayout: MobileLayout;
  viewMode: ViewMode;
  enabledTracks: Record<string, boolean>;
  playMode: PlayMode;
  shellNoise: number;
  shellThickness: number;       // 0..14 — radial jitter untuk leaf node (cangkang tebal)
  backgroundStars: number;
  themePalette: ThemePalette;
  fontScale: number;
  realSky2D: boolean;
  cameraPreset: CameraPreset;
  // 2D sky engine
  sky2DTheme: Sky2DTheme;
  constellationShape: ConstellationShape;
  starColorMode: StarColorMode;
  constellationLineOpacity: number;  // 0..1
  // 3D polish
  showAllHovers: boolean;
  microDust: boolean;
  microDustDensity: number;     // 200..2000
  interClusterLinks: boolean;
  pulseGlowOnHover: boolean;
  // Lobby
  lobbyStyle: LobbyStyle;
  showHudStrip: boolean;
  showMiniMap: boolean;
  sidebarOffset: { x: number; y: number };
  sidePanelOffset: { x: number; y: number };
}

export const DEFAULT_SETTINGS: Settings = {
  quality: typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 900) ? "low" : "ultra",
  fpsCap: 60,
  showFps: false,
  bloomIntensity: 0.7,
  nebulaOpacity: 0.95,
  starSize: 1.0,
  showHoverEdges: true,
  autoRotate: true,
  autoRotateSpeed: 0.25,
  damping: 0.1,
  audioMuted: true,
  audioVolume: 0.35,
  reducedMotion: false,
  highContrastLabels: false,
  mobileLayout: "sheet",
  viewMode: "3d",
  enabledTracks: {},
  playMode: "shuffle",
  shellNoise: 2.2,
  shellThickness: 7,
  backgroundStars: 2500,
  themePalette: "aurora",
  fontScale: 1.0,
  realSky2D: false,
  cameraPreset: "free",
  sky2DTheme: "mondstadt",
  constellationShape: "free_lines",
  starColorMode: "cluster",
  constellationLineOpacity: 0.45,
  showAllHovers: false,
  microDust: true,
  microDustDensity: 700,
  interClusterLinks: false,
  pulseGlowOnHover: true,
  lobbyStyle: "cinematic",
  showHudStrip: false,
  showMiniMap: false,
  sidebarOffset: { x: 0, y: 0 },
  sidePanelOffset: { x: 0, y: 0 },
};



interface UniverseState {
  selectedId: string | null;
  hoveredId: string | null;
  focusClusterKey: string | null;
  searchOpen: boolean;
  settingsOpen: boolean;
  assistantOpen: boolean;
  loaded: boolean;
  editorMode: boolean;
  editorUnlockOpen: boolean;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  focusCluster: (k: string | null) => void;
  setSearchOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setAssistantOpen: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
  setEditorMode: (v: boolean) => void;
  setEditorUnlockOpen: (v: boolean) => void;
}

export const useUniverse = create<UniverseState>((set) => ({
  selectedId: null,
  hoveredId: null,
  focusClusterKey: null,
  searchOpen: false,
  settingsOpen: false,
  assistantOpen: false,
  loaded: false,
  editorMode: typeof window !== "undefined" && sessionStorage.getItem("editor_unlocked") === "1",
  editorUnlockOpen: false,
  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  focusCluster: (k) => set({ focusClusterKey: k, selectedId: k ? `cluster:${k}` : null }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setAssistantOpen: (v) => set({ assistantOpen: v }),
  setLoaded: (v) => set({ loaded: v }),
  setEditorMode: (v) => { if (typeof window !== "undefined") { if (v) sessionStorage.setItem("editor_unlocked","1"); else sessionStorage.removeItem("editor_unlocked"); } set({ editorMode: v }); },
  setEditorUnlockOpen: (v) => set({ editorUnlockOpen: v }),
}));

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch as Settings),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "smandash-settings-v3",
      merge: (persisted, current) => ({ ...current, ...(persisted as object) }),
    }
  )
);
