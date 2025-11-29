import { create } from 'zustand';
import type { OVRViseme } from 'shared';

interface VisemeState {
  currentViseme: OVRViseme;
  weight: number; // 0.0 to 1.0, controls blend strength
  setViseme: (viseme: OVRViseme, weight?: number) => void;
  clearViseme: () => void;
}

export const useVisemeStore = create<VisemeState>((set) => ({
  currentViseme: 'sil',
  weight: 0.0,

  setViseme: (viseme: OVRViseme, weight = 1.0) => {
    set({ currentViseme: viseme, weight: Math.max(0, Math.min(1, weight)) });
  },

  clearViseme: () => {
    set({ currentViseme: 'sil', weight: 0.0 });
  },
}));
