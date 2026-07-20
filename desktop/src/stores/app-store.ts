import { create } from 'zustand';
import type { AppRoute, AIStatus } from '../types';

interface AppStore {
  activeRoute: AppRoute;
  setActiveRoute: (route: AppRoute) => void;

  aiStatus: AIStatus;
  setAIStatus: (status: AIStatus) => void;

  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  hoverInput: boolean;
  setHoverInput: (hover: boolean) => void;

  agentName: string;
  setAgentName: (name: string) => void;

  modelName: string;
  setModelName: (name: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeRoute: 'home',
  setActiveRoute: (route) => set({ activeRoute: route }),

  aiStatus: 'online',
  setAIStatus: (status) => set({ aiStatus: status }),

  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),

  hoverInput: false,
  setHoverInput: (hover) => set({ hoverInput: hover }),

  agentName: 'VeloraAgent',
  setAgentName: (name) => set({ agentName: name }),

  modelName: '',
  setModelName: (name) => set({ modelName: name }),
}));
