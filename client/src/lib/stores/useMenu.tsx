import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type MenuPhase = "main" | "settings" | "playing" | "paused";

interface MenuState {
  phase: MenuPhase;
  selectedOption: number;
  settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    fullscreen: boolean;
  };
  
  // Actions
  setPhase: (phase: MenuPhase) => void;
  setSelectedOption: (option: number) => void;
  updateSettings: (settings: Partial<MenuState['settings']>) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  selectOption: () => void;
}

export const useMenu = create<MenuState>()(
  subscribeWithSelector((set, get) => ({
    phase: "main",
    selectedOption: 0,
    settings: {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      musicVolume: 0.6,
      fullscreen: false,
    },
    
    setPhase: (phase) => {
      set({ phase });
      console.log(`Menu phase changed to: ${phase}`);
    },
    
    setSelectedOption: (option) => {
      set({ selectedOption: option });
    },
    
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    },
    
    navigateUp: () => {
      set((state) => {
        const maxOptions = state.phase === "main" ? 2 : 4; // Main: Start, Settings, Exit; Settings: 4 options
        const newOption = state.selectedOption > 0 ? state.selectedOption - 1 : maxOptions;
        return { selectedOption: newOption };
      });
    },
    
    navigateDown: () => {
      set((state) => {
        const maxOptions = state.phase === "main" ? 2 : 4;
        const newOption = state.selectedOption < maxOptions ? state.selectedOption + 1 : 0;
        return { selectedOption: newOption };
      });
    },
    
    selectOption: () => {
      const { phase, selectedOption } = get();
      
      if (phase === "main") {
        switch (selectedOption) {
          case 0: // Start Game
            set({ phase: "playing" });
            break;
          case 1: // Settings
            set({ phase: "settings", selectedOption: 0 });
            break;
          case 2: // Exit
            console.log("Exit game requested");
            break;
        }
      } else if (phase === "settings" && selectedOption === 4) {
        // Back to main menu
        set({ phase: "main", selectedOption: 0 });
      }
    }
  }))
);
