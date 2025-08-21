import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { KeyboardControls } from "@react-three/drei";
import { MenuBackground } from "./MenuBackground";

// Define control keys for the game
const controls = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "jump", keys: ["Space"] },
  { name: "interact", keys: ["KeyE"] },
];

export function GameScene() {
  return (
    <KeyboardControls map={controls}>
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-black/60">
        <div className="text-center space-y-8 p-8 bg-gray-900/90 rounded-lg backdrop-blur-sm border border-gray-700 shadow-2xl">
          <h2 className="text-4xl font-bold text-white mb-4">Game Started!</h2>
          <p className="text-xl text-gray-300 mb-6">
            Your game is now running. This is where the actual gameplay would happen.
          </p>
          <div className="space-y-2 text-gray-400">
            <p>Controls:</p>
            <p>WASD or Arrow Keys - Move</p>
            <p>Space - Jump</p>
            <p>E - Interact</p>
          </div>
        </div>
      </div>
    </KeyboardControls>
  );
}
