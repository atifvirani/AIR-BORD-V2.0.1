import { create } from "zustand";
import { GestureState, BrushSettings } from "../types";

interface AppState {
  isAirBoardActive: boolean;
  setAirBoardActive: (active: boolean) => void;

  currentGesture: GestureState;
  setCurrentGesture: (gesture: GestureState) => void;

  confidence: number;
  setConfidence: (confidence: number) => void;

  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  fps: number;
  setFps: (fps: number) => void;

  particlesEnabled: boolean;
  setParticlesEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAirBoardActive: false,
  setAirBoardActive: (active) => set({ isAirBoardActive: active }),

  currentGesture: GestureState.NONE,
  setCurrentGesture: (gesture) => set({ currentGesture: gesture }),

  confidence: 0,
  setConfidence: (confidence) => set({ confidence }),

  brushSettings: {
    color: "#00f3ff",
    size: 5,
  },
  setBrushSettings: (settings) =>
    set((state) => ({
      brushSettings: { ...state.brushSettings, ...settings },
    })),

  fps: 0,
  setFps: (fps) => set({ fps }),

  particlesEnabled: true,
  setParticlesEnabled: (enabled) => set({ particlesEnabled: enabled }),
}));
