import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AudioMetrics, JarvisSystemState } from "../types/jarvis";

interface JarvisCore3DProps {
  systemState: JarvisSystemState;
  sampleAudioMetrics: () => AudioMetrics;
  onCoreClick?: () => void;
}

const STATE_PALETTES: Record<
  JarvisSystemState,
  { primary: string; secondary: string; glow: string; speedMultiplier: number }
> = {
  CONNECTING: {
    primary: "#64748b",
    secondary: "#38bdf8",
    glow: "#0284c7",
    speedMultiplier: 0.65,
  },
  READY: {
    primary: "#06b6d4",
    secondary: "#38bdf8",
    glow: "#0ea5e9",
    speedMultiplier: 0.85,
  },
  LISTENING: {
    primary: "#06b6d4",
    secondary: "#22d3ee",
    glow: "#0ea5e9",
    speedMultiplier: 1.0,
  },
  "USER SPEAKING": {
    primary: "#2dd4bf",
    secondary: "#22d3ee",
    glow: "#14b8a6",
    speedMultiplier: 1.85,
  },
  THINKING: {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    glow: "#d97706",
    speedMultiplier: 2.6,
  },
  "JARVIS SPEAKING": {
    primary: "#38bdf8",
    secondary: "#67e8f9",
    glow: "#0284c7",
    speedMultiplier: 2.1,
  },
  ERROR: {
    primary: "#ef4444",
    secondary: "#f87171",
    glow: "#dc2626",
    speedMultiplier: 0.4,
  },
};

/**
 * Automatically adjusts camera distance on mobile/tablet/desktop viewports
 * so the 3D JARVIS core and its outer rings always fit cleanly.
 */
function ResponsiveCameraRig() {
  const { camera, size } = useThree();

  useFrame((state) => {
    const aspect = size.width / Math.max(1, size.height);
    const targetZ = aspect < 0.75 ? 8.4 : aspect < 1.1 ? 7.2 : 6.1;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);

    // Subtle holographic camera float
    const t = state.clock.getElapsedTime();
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      Math.sin(t * 0.35) * 0.14,
      0.05
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      Math.cos(t * 0.28) * 0.12,
      0.05
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/**
 * The multi-layered audio-reactive 3D JARVIS Core assembly.
 */
function JarvisCoreAssembly({
  systemState,
  sampleAudioMetrics,
}: {
  systemState: JarvisSystemState;
  sampleAudioMetrics: () => AudioMetrics;
}) {
  // Refs for 3D meshes and lights
  const rootGroupRef = useRef<THREE.Group>(null);
  const innerNucleusRef = useRef<THREE.Mesh>(null);
  const displacedSphereRef = useRef<THREE.Mesh>(null);
  const glassCageRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const ring4Ref = useRef<THREE.Group>(null);
  const spectrumInstancedRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);

  // Materials for smooth color transitions
  const primaryColorRef = useRef(new THREE.Color("#06b6d4"));
  const secondaryColorRef = useRef(new THREE.Color("#38bdf8"));
  const glowColorRef = useRef(new THREE.Color("#0ea5e9"));
  const targetPrimaryRef = useRef(new THREE.Color("#06b6d4"));
  const targetSecondaryRef = useRef(new THREE.Color("#38bdf8"));
  const targetGlowRef = useRef(new THREE.Color("#0ea5e9"));

  // Base geometry for real-time vertex displacement on the energy nucleus
  const { displacedGeometry, basePositions } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.96, 5);
    const posAttr = geo.attributes.position;
    const copy = new Float32Array(posAttr.array.length);
    copy.set(posAttr.array);
    return { displacedGeometry: geo, basePositions: copy };
  }, []);

  // 360 orbital particles around the core
  const { particleGeometry, particleInitialPositions, particlePhases } =
    useMemo(() => {
      const count = 360;
      const positions = new Float32Array(count * 3);
      const initial = new Float32Array(count * 3);
      const phases = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const radius = 1.65 + Math.random() * 2.1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        initial[i * 3] = x;
        initial[i * 3 + 1] = y;
        initial[i * 3 + 2] = z;

        phases[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      return {
        particleGeometry: geo,
        particleInitialPositions: initial,
        particlePhases: phases,
      };
    }, []);

  // Pre-allocated matrix and object for the 64 radial frequency bars
  const dummyObject = useMemo(() => new THREE.Object3D(), []);
  const spectrumCount = 64;

  // Segmented outer telemetry arcs
  const outerSegments = useMemo(() => {
    return [0, 1, 2, 3].map((idx) => ({
      rotationZ: (idx * Math.PI) / 2,
      arcLength: Math.PI * 0.34,
    }));
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const metrics = sampleAudioMetrics();
    const palette = STATE_PALETTES[systemState] || STATE_PALETTES.LISTENING;

    targetPrimaryRef.current.set(palette.primary);
    targetSecondaryRef.current.set(palette.secondary);
    targetGlowRef.current.set(palette.glow);

    const colorLerpFactor = Math.min(1, delta * 5.5);
    primaryColorRef.current.lerp(targetPrimaryRef.current, colorLerpFactor);
    secondaryColorRef.current.lerp(targetSecondaryRef.current, colorLerpFactor);
    glowColorRef.current.lerp(targetGlowRef.current, colorLerpFactor);

    const level = metrics.activeLevel;
    const bass = metrics.bass;
    const mid = metrics.mid;
    const treble = metrics.treble;
    const speed = palette.speedMultiplier + level * 2.4;

    // 1. Dynamic Core Point Light
    if (coreLightRef.current) {
      coreLightRef.current.color.copy(primaryColorRef.current);
      const baseIntensity =
        systemState === "JARVIS SPEAKING"
          ? 4.2
          : systemState === "USER SPEAKING"
          ? 3.6
          : systemState === "THINKING"
          ? 3.2
          : 2.2;
      coreLightRef.current.intensity =
        baseIntensity + level * 6.5 + Math.sin(t * 3.0) * 0.3;
    }

    // 2. Inner Glowing Plasma Nucleus
    if (innerNucleusRef.current) {
      const pulse =
        1 +
        bass * 0.38 +
        level * 0.25 +
        Math.sin(t * (systemState === "THINKING" ? 6.0 : 2.2)) * 0.04;
      innerNucleusRef.current.scale.setScalar(pulse);
      const mat = innerNucleusRef.current
        .material as THREE.MeshStandardMaterial;
      mat.color.copy(secondaryColorRef.current);
      mat.emissive.copy(primaryColorRef.current);
      mat.emissiveIntensity = 1.6 + level * 3.2;
    }

    // 3. Real-Time Vertex Displacement on Energy Sphere
    if (displacedSphereRef.current) {
      const posAttr = displacedGeometry.attributes
        .position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const vertexCount = arr.length / 3;

      const displacementAmp =
        systemState === "JARVIS SPEAKING"
          ? 0.08 + level * 0.34
          : systemState === "USER SPEAKING"
          ? 0.06 + level * 0.28
          : systemState === "THINKING"
          ? 0.09
          : 0.03 + level * 0.12;

      const waveFreq = systemState === "THINKING" ? 5.5 : 3.2;

      for (let i = 0; i < vertexCount; i++) {
        const ix = i * 3;
        const bx = basePositions[ix];
        const by = basePositions[ix + 1];
        const bz = basePositions[ix + 2];

        const binVal = metrics.frequencyBins[i % 64] / 255.0;
        const wave =
          Math.sin(bx * 3.5 + t * waveFreq) *
          Math.cos(by * 3.5 - t * (waveFreq * 0.8)) *
          Math.sin(bz * 3.5 + t * 2.1);

        const scale = 1 + wave * displacementAmp + binVal * level * 0.22;
        arr[ix] = bx * scale;
        arr[ix + 1] = by * scale;
        arr[ix + 2] = bz * scale;
      }
      posAttr.needsUpdate = true;

      displacedSphereRef.current.rotation.y += delta * 0.35 * speed;
      displacedSphereRef.current.rotation.z += delta * 0.2 * speed;

      const mat = displacedSphereRef.current
        .material as THREE.MeshStandardMaterial;
      mat.color.copy(primaryColorRef.current);
      mat.emissive.copy(glowColorRef.current);
      mat.emissiveIntensity = 0.85 + level * 2.1;
    }

    // 4. Transparent Glass Containment Shell
    if (glassCageRef.current) {
      glassCageRef.current.rotation.x -= delta * 0.22 * speed;
      glassCageRef.current.rotation.y += delta * 0.31 * speed;
      const cageScale =
        systemState === "THINKING"
          ? 0.95 + Math.sin(t * 5) * 0.04
          : 1 + bass * 0.14;
      glassCageRef.current.scale.setScalar(cageScale);
      const mat = glassCageRef.current.material as THREE.MeshPhysicalMaterial;
      mat.color.copy(secondaryColorRef.current);
      mat.emissive.copy(primaryColorRef.current);
      mat.emissiveIntensity = 0.25 + mid * 0.8;
    }

    // 5. Concentric Gyroscopic Rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * (0.55 + bass * 1.8) * speed;
      ring1Ref.current.rotation.y += delta * 0.35 * speed;
      const mat = ring1Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.copy(primaryColorRef.current);
      mat.emissive.copy(primaryColorRef.current);
      mat.emissiveIntensity = 0.9 + bass * 1.8;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * (0.48 + mid * 1.6) * speed;
      ring2Ref.current.rotation.z += delta * 0.42 * speed;
      const mat = ring2Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.copy(secondaryColorRef.current);
      mat.emissive.copy(glowColorRef.current);
      mat.emissiveIntensity = 0.7 + mid * 1.6;
    }

    if (ring3Ref.current) {
      ring3Ref.current.rotation.x -= delta * 0.28 * speed;
      ring3Ref.current.rotation.z -= delta * (0.62 + treble * 2.0) * speed;
      const mat = ring3Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.copy(primaryColorRef.current);
      mat.emissive.copy(secondaryColorRef.current);
      mat.emissiveIntensity = 0.6 + treble * 1.9;
    }

    if (ring4Ref.current) {
      ring4Ref.current.rotation.z += delta * 0.25 * speed;
      ring4Ref.current.rotation.x =
        Math.sin(t * 0.5) * 0.35 + (level * 0.35);
      ring4Ref.current.rotation.y = Math.cos(t * 0.4) * 0.35;
    }

    // 6. 64-Node Radial 3D Audio Spectrum Ring
    if (spectrumInstancedRef.current) {
      const baseRadius = 2.15;
      for (let i = 0; i < spectrumCount; i++) {
        const angle = (i / spectrumCount) * Math.PI * 2 + t * 0.18;
        const binNormalized = metrics.frequencyBins[i] / 255.0;

        // Idle subtle breathing vs active voice spectrum spikes
        const idleWave = Math.sin(angle * 4 + t * 2.5) * 0.04 + 0.06;
        const barHeight = Math.max(0.06, idleWave + binNormalized * (0.55 + level * 0.65));
        const radialOffset = baseRadius + barHeight * 0.32;

        dummyObject.position.set(
          Math.cos(angle) * radialOffset,
          Math.sin(angle) * radialOffset,
          Math.sin(angle * 2 + t * 1.5) * (0.06 + mid * 0.18)
        );
        dummyObject.rotation.set(0, 0, angle + Math.PI / 2);
        dummyObject.scale.set(0.028, barHeight, 0.028);
        dummyObject.updateMatrix();
        spectrumInstancedRef.current.setMatrixAt(i, dummyObject.matrix);
      }
      spectrumInstancedRef.current.instanceMatrix.needsUpdate = true;
      const mat = spectrumInstancedRef.current
        .material as THREE.MeshStandardMaterial;
      mat.color.copy(secondaryColorRef.current);
      mat.emissive.copy(primaryColorRef.current);
      mat.emissiveIntensity = 1.2 + level * 2.5;
    }

    // 7. 3D Orbital Particle Field
    if (particlesRef.current) {
      const posAttr = particleGeometry.attributes
        .position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = particlePhases.length;

      // Contract slightly when thinking, expand when speaking
      const radialFactor =
        systemState === "THINKING"
          ? 0.82 + Math.sin(t * 4.0) * 0.08
          : 1.0 + level * 0.32;

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const phase = particlePhases[i];
        const drift = Math.sin(t * 1.2 + phase) * 0.08;
        const scale = radialFactor + drift;

        arr[ix] = particleInitialPositions[ix] * scale;
        arr[ix + 1] = particleInitialPositions[ix + 1] * scale;
        arr[ix + 2] = particleInitialPositions[ix + 2] * scale;
      }
      posAttr.needsUpdate = true;

      particlesRef.current.rotation.y += delta * 0.12 * speed;
      particlesRef.current.rotation.x += delta * 0.06 * speed;

      const mat = particlesRef.current.material as THREE.PointsMaterial;
      mat.color.copy(secondaryColorRef.current);
      mat.opacity = 0.55 + Math.min(0.4, level * 0.5);
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* Central Dynamic Core Light */}
      <pointLight
        ref={coreLightRef}
        position={[0, 0, 0]}
        intensity={3}
        distance={12}
        decay={2}
      />

      {/* Layer 1: Inner Glowing Plasma Nucleus */}
      <mesh ref={innerNucleusRef}>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#06b6d4"
          emissiveIntensity={2.0}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>

      {/* Layer 2: Audio-Displaced Wireframe Energy Matrix */}
      <mesh ref={displacedSphereRef} geometry={displacedGeometry}>
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#0ea5e9"
          emissiveIntensity={1.1}
          wireframe
          transparent
          opacity={0.78}
        />
      </mesh>

      {/* Layer 3: Translucent Glass Geodesic Containment Shell */}
      <mesh ref={glassCageRef}>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          emissive="#06b6d4"
          emissiveIntensity={0.3}
          roughness={0.12}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.22}
          wireframe={false}
          flatShading
        />
      </mesh>

      {/* Layer 4: Inner Gimbal Ring */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.62, 0.016, 16, 120]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Layer 5: Mid Gyroscopic Ring */}
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <torusGeometry args={[1.92, 0.012, 16, 120]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Layer 6: 64-Node Radial 3D Audio Spectrum Bars */}
      <instancedMesh
        ref={spectrumInstancedRef}
        args={[undefined, undefined, spectrumCount]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#06b6d4"
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.5}
        />
      </instancedMesh>

      {/* Layer 7: Outer Precision Orbital Ring */}
      <mesh ref={ring3Ref} rotation={[Math.PI / 2.2, 0, Math.PI / 4]}>
        <torusGeometry args={[2.58, 0.01, 16, 140]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#38bdf8"
          emissiveIntensity={0.75}
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Layer 8: Segmented Outer Telemetry Arcs */}
      <group ref={ring4Ref}>
        {outerSegments.map((seg, idx) => (
          <mesh key={idx} rotation={[0, 0, seg.rotationZ]}>
            <torusGeometry args={[2.86, 0.018, 12, 48, seg.arcLength]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.95}
              roughness={0.2}
              metalness={0.85}
              transparent
              opacity={0.75}
            />
          </mesh>
        ))}
      </group>

      {/* Layer 9: 3D Orbital Particle Field */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          size={0.036}
          color="#38bdf8"
          transparent
          opacity={0.65}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export const JarvisCore3D: React.FC<JarvisCore3DProps> = ({
  systemState,
  sampleAudioMetrics,
  onCoreClick,
}) => {
  const [contextLost, setContextLost] = useState(false);

  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
  };

  useEffect(() => {
    // Ensure clean state on mount
    setContextLost(false);
  }, []);

  const palette = STATE_PALETTES[systemState] || STATE_PALETTES.LISTENING;

  return (
    <div
      onClick={onCoreClick}
      className="relative w-full h-full flex items-center justify-center cursor-pointer select-none"
      role="button"
      tabIndex={0}
      aria-label={`JARVIS AI Core — Current state: ${systemState}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCoreClick?.();
        }
      }}
    >
      {/* Ambient Radial Atmospheric Backlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 46%, ${palette.primary}1f 0%, ${palette.glow}0d 32%, transparent 68%)`,
        }}
      />

      {contextLost ? (
        /* Graceful fallback if WebGL context is ever suspended on low-memory mobile */
        <div className="relative flex items-center justify-center w-64 h-64 rounded-full border border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_80px_rgba(6,182,212,0.25)]">
          <div className="w-36 h-36 rounded-full border border-cyan-400/50 bg-cyan-500/10 animate-pulse" />
        </div>
      ) : (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 6.2], fov: 45, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          onCreated={handleCreated}
          className="w-full h-full"
        >
          <fog attach="fog" args={["#030712", 6.5, 16]} />

          {/* Three-Point Studio Lighting */}
          <ambientLight intensity={0.45} color="#0f172a" />
          <directionalLight
            position={[4, 5, 4]}
            intensity={1.4}
            color="#e0f2fe"
          />
          <directionalLight
            position={[-5, -3, -4]}
            intensity={0.9}
            color="#0284c7"
          />
          <pointLight
            position={[0, 3.5, -3]}
            intensity={1.6}
            color={palette.secondary}
          />

          <ResponsiveCameraRig />
          <JarvisCoreAssembly
            systemState={systemState}
            sampleAudioMetrics={sampleAudioMetrics}
          />
        </Canvas>
      )}
    </div>
  );
};
