import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";
import { useMenu } from "@/lib/stores/useMenu";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound, isMuted } = useAudio();
  const { settings } = useMenu();
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Load background music
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = settings.musicVolume * settings.masterVolume;
    backgroundMusicRef.current = bgMusic;
    setBackgroundMusic(bgMusic);
    
    // Load sound effects
    const hitSound = new Audio("/sounds/hit.mp3");
    hitSound.volume = settings.sfxVolume * settings.masterVolume;
    setHitSound(hitSound);
    
    const successSound = new Audio("/sounds/success.mp3");
    successSound.volume = settings.sfxVolume * settings.masterVolume;
    setSuccessSound(successSound);
    
    return () => {
      bgMusic.pause();
      bgMusic.remove();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);
  
  // Update volumes when settings change
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = settings.musicVolume * settings.masterVolume;
    }
  }, [settings.musicVolume, settings.masterVolume]);
  
  // Handle mute state
  useEffect(() => {
    if (backgroundMusicRef.current) {
      if (isMuted) {
        backgroundMusicRef.current.pause();
      } else {
        backgroundMusicRef.current.play().catch(e => 
          console.log("Background music autoplay prevented:", e)
        );
      }
    }
  }, [isMuted]);
  
  return null;
}
