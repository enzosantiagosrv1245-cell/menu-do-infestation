import { useEffect } from "react";
import { useMenu } from "@/lib/stores/useMenu";
import { useAudio } from "@/lib/stores/useAudio";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SettingsMenu() {
  const { selectedOption, setSelectedOption, setPhase, settings, updateSettings } = useMenu();
  const { playHit, toggleMute, isMuted } = useAudio();
  
  const settingsOptions = [
    { label: "Master Volume", type: "slider", value: settings.masterVolume },
    { label: "SFX Volume", type: "slider", value: settings.sfxVolume },
    { label: "Music Volume", type: "slider", value: settings.musicVolume },
    { label: "Mute Audio", type: "switch", value: isMuted },
    { label: "Back to Main", type: "button", action: () => setPhase("main") }
  ];
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          event.preventDefault();
          setSelectedOption(selectedOption > 0 ? selectedOption - 1 : settingsOptions.length - 1);
          playHit();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          event.preventDefault();
          setSelectedOption(selectedOption < settingsOptions.length - 1 ? selectedOption + 1 : 0);
          playHit();
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          event.preventDefault();
          handleValueChange(-0.1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          event.preventDefault();
          handleValueChange(0.1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleSelect();
          break;
        case "Escape":
          event.preventDefault();
          setPhase("main");
          playHit();
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOption, setSelectedOption, playHit, setPhase]);
  
  const handleValueChange = (delta: number) => {
    const option = settingsOptions[selectedOption];
    if (option.type === "slider") {
      const newValue = Math.max(0, Math.min(1, option.value + delta));
      
      switch (selectedOption) {
        case 0:
          updateSettings({ masterVolume: newValue });
          break;
        case 1:
          updateSettings({ sfxVolume: newValue });
          break;
        case 2:
          updateSettings({ musicVolume: newValue });
          break;
      }
      playHit();
    }
  };
  
  const handleSelect = () => {
    const option = settingsOptions[selectedOption];
    
    if (option.type === "switch" && selectedOption === 3) {
      toggleMute();
    } else if (option.type === "button") {
      option.action?.();
      playHit();
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-black/60">
      <div className="text-center space-y-6 p-8 bg-gray-900/90 rounded-lg backdrop-blur-sm border border-gray-700 shadow-2xl">
        {/* Settings Title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">Configure your game preferences</p>
        </div>
        
        {/* Settings Options */}
        <div className="space-y-6 min-w-[400px]">
          {settingsOptions.map((option, index) => (
            <div
              key={option.label}
              className={cn(
                "p-4 rounded-lg border-2 transition-all duration-200",
                selectedOption === index
                  ? "bg-blue-600/20 border-blue-400 shadow-lg shadow-blue-500/25"
                  : "bg-gray-800/50 border-gray-600"
              )}
            >
              <div className="flex items-center justify-between">
                <label className="text-white font-medium">
                  {option.label}
                </label>
                
                {option.type === "slider" && (
                  <div className="flex items-center space-x-4 w-48">
                    <Slider
                      value={[option.value]}
                      onValueChange={([value]) => {
                        switch (index) {
                          case 0:
                            updateSettings({ masterVolume: value });
                            break;
                          case 1:
                            updateSettings({ sfxVolume: value });
                            break;
                          case 2:
                            updateSettings({ musicVolume: value });
                            break;
                        }
                      }}
                      max={1}
                      min={0}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-gray-300 w-12 text-right">
                      {Math.round(option.value * 100)}%
                    </span>
                  </div>
                )}
                
                {option.type === "switch" && (
                  <Switch
                    checked={option.value}
                    onCheckedChange={toggleMute}
                  />
                )}
                
                {option.type === "button" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => option.action?.()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700/70"
                  >
                    Go Back
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Controls hint */}
        <div className="mt-6 text-sm text-gray-500">
          <p>Use ↑↓ to navigate • ←→ to adjust values • Enter to toggle • Esc to go back</p>
        </div>
      </div>
    </div>
  );
}
