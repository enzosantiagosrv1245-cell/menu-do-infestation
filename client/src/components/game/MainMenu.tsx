import { useEffect } from "react";
import { useMenu } from "@/lib/stores/useMenu";
import { useAudio } from "@/lib/stores/useAudio";
import { useGame } from "@/lib/stores/useGame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MainMenu() {
  const { selectedOption, setSelectedOption, selectOption, setPhase } = useMenu();
  const { playHit, playSuccess } = useAudio();
  const { start } = useGame();
  
  const menuOptions = [
    { label: "Start Game", action: () => { start(); setPhase("playing"); playSuccess(); } },
    { label: "Settings", action: () => { setPhase("settings"); playHit(); } },
    { label: "Exit", action: () => { console.log("Exit requested"); playHit(); } }
  ];
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          event.preventDefault();
          setSelectedOption(selectedOption > 0 ? selectedOption - 1 : menuOptions.length - 1);
          playHit();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          event.preventDefault();
          setSelectedOption(selectedOption < menuOptions.length - 1 ? selectedOption + 1 : 0);
          playHit();
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          menuOptions[selectedOption].action();
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOption, setSelectedOption, playHit, menuOptions]);
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-black/60">
      <div className="text-center space-y-8 p-8 bg-gray-900/90 rounded-lg backdrop-blur-sm border border-gray-700 shadow-2xl">
        {/* Game Title */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
            GAME
          </h1>
          <p className="text-xl text-gray-300">
            Interactive Gaming Experience
          </p>
        </div>
        
        {/* Menu Options */}
        <div className="space-y-4 min-w-[300px]">
          {menuOptions.map((option, index) => (
            <Button
              key={option.label}
              variant={selectedOption === index ? "default" : "outline"}
              size="lg"
              className={cn(
                "w-full text-lg py-4 px-8 transition-all duration-200 border-2",
                selectedOption === index
                  ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25 scale-105"
                  : "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500"
              )}
              onClick={() => {
                setSelectedOption(index);
                option.action();
              }}
              onMouseEnter={() => {
                setSelectedOption(index);
                playHit();
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        {/* Controls hint */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Use ↑↓ or W/S to navigate • Enter or Space to select</p>
        </div>
      </div>
    </div>
  );
}
