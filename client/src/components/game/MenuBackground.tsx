import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function MenuBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Create particles for background effect
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;     // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
  }
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Rotate background mesh
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.1;
      meshRef.current.rotation.y = time * 0.15;
    }
    
    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.05;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += Math.sin(time + positions[i3]) * 0.001;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <>
      {/* Ambient background geometry */}
      <mesh ref={meshRef} position={[0, 0, -10]}>
        <icosahedronGeometry args={[4, 1]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          wireframe 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* Particle system */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          color="#4a90e2" 
          size={0.05}
          transparent
          opacity={0.8}
        />
      </points>
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.6} 
        color="#ffffff"
      />
      <pointLight 
        position={[-5, -5, 5]} 
        intensity={0.3} 
        color="#4a90e2"
      />
    </>
  );
}
