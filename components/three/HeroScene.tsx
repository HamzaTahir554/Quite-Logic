"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Group } from "three";

const nodes: [number, number, number][] = [
  [-5.4, 2.3, -2],
  [-4.1, 0.8, -1],
  [-5.2, -1.7, -2],
  [-2.8, -3, -2],
  [3.3, 3, -2],
  [5, 1.4, -1],
  [5.4, -1.5, -2],
  [3.5, -2.8, -1],
];
function Atmosphere({ compact }: { compact: boolean }) {
  const group = useRef<Group>(null);
  const particles = useMemo(() => {
    const count = compact ? 18 : 48;
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      values[i * 3] = (((i * 37) % 101) / 100 - 0.5) * 15;
      values[i * 3 + 1] = (((i * 61) % 97) / 96 - 0.5) * 9;
      values[i * 3 + 2] = -2 - (i % 5) * 0.25;
    }
    return values;
  }, [compact]);
  const points = compact ? nodes.filter((_, i) => i % 2 === 0) : nodes;
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.rotation.y +=
      (pointer.x * 0.045 - group.current.rotation.y) * 0.025;
    group.current.rotation.x +=
      (-pointer.y * 0.035 - group.current.rotation.x) * 0.025;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.13) * 0.06;
  });
  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={compact ? 0.018 : 0.022}
          color="#a8c5e8"
          transparent
          opacity={0.32}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <Float
        speed={0.3}
        floatIntensity={compact ? 0.05 : 0.12}
        rotationIntensity={0.06}
      >
        {points.map((p, i) => (
          <group key={i}>
            <mesh position={p} rotation={[0.3, 0.5, 0.2]}>
              <boxGeometry args={[0.045, 0.045, 0.045]} />
              <meshBasicMaterial
                color={i % 3 === 0 ? "#2f80fe" : "#c0cddd"}
                transparent
                opacity={0.4}
              />
            </mesh>
            {!compact && i % 2 === 0 && (
              <Line
                points={[p, points[(i + 1) % points.length]]}
                color="#91bdff"
                transparent
                opacity={0.045}
                lineWidth={0.5}
              />
            )}
          </group>
        ))}
      </Float>
    </group>
  );
}
export default function HeroScene({ active }: { active: boolean }) {
  const compact = useMediaQuery("(max-width:700px)");
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 48 }}
      dpr={compact ? 1 : [1, 1.25]}
      frameloop={active ? "always" : "never"}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
    >
      <Atmosphere compact={compact} />
    </Canvas>
  );
}
