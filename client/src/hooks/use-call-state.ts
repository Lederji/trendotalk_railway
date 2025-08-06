import { create } from 'zustand';

interface CallState {
  isCallActive: boolean;
  isIncoming: boolean;
  callStatus: 'incoming' | 'connecting' | 'connected' | 'ended';
  caller: {
    username: string;
    avatar?: string;
  } | null;
  duration: number;
  isMuted: boolean;
  isMinimized: boolean;
}

interface CallActions {
  setCallActive: (active: boolean) => void;
  setIncoming: (incoming: boolean) => void;
  setCallStatus: (status: CallState['callStatus']) => void;
  setCaller: (caller: CallState['caller']) => void;
  setDuration: (duration: number) => void;
  setMuted: (muted: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  resetCall: () => void;
}

const initialState: CallState = {
  isCallActive: false,
  isIncoming: false,
  callStatus: 'ended',
  caller: null,
  duration: 0,
  isMuted: false,
  isMinimized: false,
};

export const useCallState = create<CallState & CallActions>((set) => ({
  ...initialState,
  
  setCallActive: (active) => set({ isCallActive: active }),
  setIncoming: (incoming) => set({ isIncoming: incoming }),
  setCallStatus: (status) => set({ callStatus: status }),
  setCaller: (caller) => set({ caller }),
  setDuration: (duration) => set({ duration }),
  setMuted: (muted) => set({ isMuted: muted }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  
  resetCall: () => set(initialState),
}));