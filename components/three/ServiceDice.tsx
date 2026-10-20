"use client";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  CanvasTexture,
  BoxGeometry,
  EdgesGeometry,
  Quaternion,
  SRGBColorSpace,
  type Group,
} from "three";
import { serviceFaces } from "@/data/serviceFaces";
import type { Rotation } from "@/lib/cube-rotation";
import { useVisualTheme } from "@/theme/VisualThemeProvider";
import { palettes, type VisualTheme } from "@/theme/tokens";

type Props = {
  active: boolean;
  selected: number;
  onSelect: (index: number) => void;
  onUnavailable: () => void;
  onReady: () => void;
  orientation: RefObject<Rotation>;
  dragging: boolean;
  hover: boolean;
};

const placements: {
  position: [number, number, number];
  rotation: [number, number, number];
}[] = [
  { position: [0, 0, 1.207], rotation: [0, 0, 0] },
  { position: [1.207, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [0, 0, -1.207], rotation: [0, Math.PI, 0] },
  { position: [-1.207, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 1.207, 0], rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, -1.207, 0], rotation: [Math.PI / 2, 0, 0] },
];

function Face({
  index,
  onSelect,
  visualTheme,
}: {
  index: number;
  onSelect: Props["onSelect"];
  visualTheme: VisualTheme;
}) {
  const down = useRef<[number, number] | null>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    const face = serviceFaces[index];
    const colors = palettes[visualTheme];
    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, 768, 768);
    ctx.strokeStyle = visualTheme === "day" ? "#33465c33" : "#F0F1F833";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 766, 766);
    ctx.strokeStyle = "#2F80FE";
    ctx.beginPath();
    ctx.moveTo(64, 2);
    ctx.lineTo(704, 2);
    ctx.stroke();
    ctx.strokeStyle = visualTheme === "day" ? "#33465c2A" : "#F0F1F82A";
    ctx.beginPath();
    ctx.roundRect(64, 64, 120, 120, 26);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = colors.accent;
    ctx.font = "48px Arial, sans-serif";
    ctx.fillText(face.icon, 124, 140);
    ctx.textAlign = "right";
    ctx.fillStyle = colors.secondary;
    ctx.font = "24px monospace";
    ctx.fillText(`0${index + 1}`, 700, 129);
    ctx.textAlign = "left";
    ctx.font = "16px monospace";
    ctx.fillText("SOFTWARE STUDIO / CAPABILITIES", 64, 257);
    ctx.fillStyle = colors.primary;
    ctx.font = "600 54px Arial, sans-serif";
    const title = index === 5 ? "Quite Logic" : face.short;
    if (index === 5) {
      ctx.fillText("Quite", 64, 345);
      const width = ctx.measureText("Quite ").width;
      ctx.fillStyle = "#2F80FE";
      ctx.fillText("Logic", 64 + width, 345);
    } else ctx.fillText(title, 64, 345, 642);
    ctx.fillStyle = colors.secondary;
    ctx.font = "28px Arial, sans-serif";
    const words = face.description.split(" ");
    let line = "",
      y = 410;
    for (const word of words) {
      const next = `${line}${word} `;
      if (ctx.measureText(next).width > 610 && line) {
        ctx.fillText(line.trim(), 64, y);
        y += 43;
        line = `${word} `;
      } else line = next;
    }
    ctx.fillText(line.trim(), 64, y);
    ctx.fillStyle = colors.secondary;
    ctx.font = "20px Arial, sans-serif";
    ctx.fillText(
      index === 5 ? "Explore all services" : "Thoughtfully engineered",
      64,
      686,
    );
    ctx.fillStyle = colors.accent;
    ctx.font = "32px Arial, sans-serif";
    ctx.fillText("→", 672, 690);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 2;
    return map;
  }, [index, visualTheme]);
  useEffect(() => () => texture.dispose(), [texture]);
  function click(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (
      down.current &&
      Math.hypot(
        event.clientX - down.current[0],
        event.clientY - down.current[1],
      ) < 10
    )
      onSelect(index);
  }
  return (
    <mesh
      {...placements[index]}
      onPointerDown={(event) => {
        down.current = [event.clientX, event.clientY];
      }}
      onClick={click}
    >
      <planeGeometry args={[2.31, 2.31]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Cube({
  onSelect,
  orientation,
  dragging,
  hover,
  visualTheme,
}: Props & { visualTheme: VisualTheme }) {
  const turn = useRef<Group>(null);
  const atmosphere = useRef<Group>(null);
  const initial = useRef(new Quaternion().fromArray(orientation.current));
  const scale = useRef(1);
  const edges = useMemo(() => {
    const box = new BoxGeometry(2.406, 2.406, 2.406);
    const outline = new EdgesGeometry(box);
    box.dispose();
    return outline;
  }, []);
  useEffect(() => () => edges.dispose(), [edges]);
  useFrame(({ pointer, clock }, delta) => {
    if (!turn.current || !atmosphere.current) return;
    const step = Math.min(delta, 0.05);
    turn.current.quaternion.fromArray(orientation.current);
    atmosphere.current.rotation.x +=
      (-pointer.y * 0.012 - atmosphere.current.rotation.x) *
      (1 - Math.exp(-4 * step));
    atmosphere.current.rotation.y +=
      (pointer.x * 0.018 - atmosphere.current.rotation.y) *
      (1 - Math.exp(-10 * step));
    atmosphere.current.position.y = dragging
      ? 0
      : Math.sin(clock.elapsedTime * 0.55) * 0.012;
    scale.current +=
      ((hover ? 1.025 : 1) - scale.current) * (1 - Math.exp(-3 * step));
    atmosphere.current.scale.setScalar(scale.current);
  });
  return (
    <group ref={atmosphere}>
      <group ref={turn} quaternion={initial.current}>
        <RoundedBox
          args={[2.4, 2.4, 2.4]}
          radius={0.045}
          smoothness={2}
          bevelSegments={2}
        >
          <meshBasicMaterial
            color={
              visualTheme === "day" ? palettes.day.secondarySurface : "#303944"
            }
            toneMapped={false}
          />
        </RoundedBox>
        <lineSegments geometry={edges}>
          <lineBasicMaterial
            color="#2F80FE"
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </lineSegments>
        {serviceFaces.map((face, index) => (
          <Face
            key={face.slug}
            index={index}
            onSelect={onSelect}
            visualTheme={visualTheme}
          />
        ))}
      </group>
    </group>
  );
}

function ContextGuard({
  onUnavailable,
  onReady,
}: {
  onUnavailable: () => void;
  onReady: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current < 2 && ++frames.current === 2) onReady();
  });
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}

export default function ServiceDice(props: Props) {
  const { theme } = useVisualTheme();
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 38 }}
      dpr={[1, 1.25]}
      frameloop={props.active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <Cube {...props} visualTheme={theme} />
      <ContextGuard
        onUnavailable={props.onUnavailable}
        onReady={props.onReady}
      />
    </Canvas>
  );
}
