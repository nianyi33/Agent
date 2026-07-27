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

  wechatStatus: string;
  setWechatStatus: (status: string) => void;
  wechatQr: string | null;
  setWechatQr: (qr: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeRoute: 'home',
  setActiveRoute: (route) => set({ activeRoute: route }),

  aiStatus: 'offline',
  setAIStatus: (status) => set({ aiStatus: status }),

  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),

  hoverInput: false,
  setHoverInput: (hover) => set({ hoverInput: hover }),

  agentName: '闪电树懒',
  setAgentName: (name) => set({ agentName: name }),

  modelName: localStorage.getItem('velora_model') || '',
  setModelName: (name) => { localStorage.setItem('velora_model', name); set({ modelName: name }); },

  wechatStatus: '',
  setWechatStatus: (status) => set({ wechatStatus: status }),
  wechatQr: null,
  setWechatQr: (qr) => set({ wechatQr: qr }),
}));
