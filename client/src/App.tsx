import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { useMenu } from "@/lib/stores/useMenu";
import { useGame } from "@/lib/stores/useGame";
import { MainMenu } from "@/components/game/MainMenu";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { GameScene } from "@/components/game/GameScene";
import { MenuBackground } from "@/components/game/MenuBackground";
import { SoundManager } from "@/components/game/SoundManager";
import "@fontsource/inter";

function App() {
  const { phase } = useMenu();
  const { phase: gamePhase } = useGame();
  const [showCanvas, setShowCanvas] = useState(false);

  // Show the canvas once everything is loaded
  useEffect(() => {
    setShowCanvas(true);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <>
          {/* 3D Background Scene */}
          <Canvas
            shadows
            camera={{
              position: [0, 2, 8],
              fov: 45,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "high-performance"
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          >
            <color attach="background" args={["#0a0a0a"]} />
            
            <Suspense fallback={null}>
              <MenuBackground />
            </Suspense>
          </Canvas>

          {/* UI Overlays */}
          {phase === "main" && <MainMenu />}
          {phase === "settings" && <SettingsMenu />}
          {phase === "playing" && gamePhase === "playing" && <GameScene />}

          {/* Sound Management */}
          <SoundManager />
        </>
      )}
    </div>
  );
}

export default App;
