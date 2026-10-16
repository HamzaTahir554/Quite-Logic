"use client";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  BoxGeometry,
  EdgesGeometry,
  Euler,
  Quaternion,
  SRGBColorSpace,
  type Group,
} from "three";
import type { MotionValue } from "framer-motion";
import { faceRotations, serviceFaces } from "@/data/serviceFaces";

type Props = {
  active: boolean;
  selected: number;
  onSelect: (index: number) => void;
  onSettled: () => void;
  onUnavailable: () => void;
  drag: MotionValue<number>;
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
}: {
  index: number;
  onSelect: Props["onSelect"];
}) {
  const down = useRef<[number, number] | null>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    const face = serviceFaces[index];
    ctx.fillStyle = "#596572";
    ctx.fillRect(0, 0, 768, 768);
    ctx.strokeStyle = "#F0F1F833";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 766, 766);
    ctx.strokeStyle = "#2F80FE";
    ctx.beginPath();
    ctx.moveTo(64, 2);
    ctx.lineTo(704, 2);
    ctx.stroke();
    ctx.strokeStyle = "#F0F1F82A";
    ctx.beginPath();
    ctx.roundRect(64, 64, 120, 120, 26);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#91BDFF";
    ctx.font = "48px Arial, sans-serif";
    ctx.fillText(face.icon, 124, 140);
    ctx.textAlign = "right";
    ctx.fillStyle = "#D1D6DE";
    ctx.font = "24px monospace";
    ctx.fillText(`0${index + 1}`, 700, 129);
    ctx.textAlign = "left";
    ctx.font = "16px monospace";
    ctx.fillText("SOFTWARE STUDIO / CAPABILITIES", 64, 257);
    ctx.fillStyle = "#F0F1F8";
    ctx.font = "600 54px Arial, sans-serif";
    const title = index === 5 ? "Quite Logic" : face.short;
    if (index === 5) {
      ctx.fillText("Quite", 64, 345);
      const width = ctx.measureText("Quite ").width;
      ctx.fillStyle = "#2F80FE";
      ctx.fillText("Logic", 64 + width, 345);
    } else ctx.fillText(title, 64, 345, 642);
    ctx.fillStyle = "#D1D6DE";
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
    ctx.fillStyle = "#D1D6DE";
    ctx.font = "20px Arial, sans-serif";
    ctx.fillText(
      index === 5 ? "Explore all services" : "Thoughtfully engineered",
      64,
      686,
    );
    ctx.fillStyle = "#91BDFF";
    ctx.font = "32px Arial, sans-serif";
    ctx.fillText("↗", 672, 690);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 2;
    return map;
  }, [index]);
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

function Cube({ selected, onSelect, onSettled, drag, dragging, hover }: Props) {
  const turn = useRef<Group>(null);
  const atmosphere = useRef<Group>(null);
  const delivered = useRef(-1);
  const orientation = useMemo(
    () => new Quaternion().setFromEuler(new Euler(...faceRotations[selected])),
    [selected],
  );
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
    turn.current.quaternion.slerp(orientation, 1 - Math.exp(-5.8 * step));
    atmosphere.current.rotation.x +=
      (0.2 - pointer.y * 0.045 - atmosphere.current.rotation.x) *
      (1 - Math.exp(-4 * step));
    atmosphere.current.rotation.y +=
      (-0.43 +
        pointer.x * 0.065 +
        drag.get() * 0.42 -
        atmosphere.current.rotation.y) *
      (1 - Math.exp(-10 * step));
    atmosphere.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.035;
    scale.current +=
      ((hover ? 1.025 : 1) - scale.current) * (1 - Math.exp(-3 * step));
    atmosphere.current.scale.setScalar(scale.current);
    if (
      !dragging &&
      turn.current.quaternion.angleTo(orientation) < 0.015 &&
      delivered.current !== selected
    ) {
      delivered.current = selected;
      onSettled();
    }
  });
  return (
    <group ref={atmosphere}>
      <group ref={turn}>
        <RoundedBox
          args={[2.4, 2.4, 2.4]}
          radius={0.045}
          smoothness={2}
          bevelSegments={2}
        >
          <meshBasicMaterial color="#303944" toneMapped={false} />
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
          <Face key={face.slug} index={index} onSelect={onSelect} />
        ))}
      </group>
    </group>
  );
}

function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const gl = useThree((state) => state.gl);
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
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 38 }}
      dpr={[1, 1.25]}
      frameloop={props.active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <Cube {...props} />
      <ContextGuard onUnavailable={props.onUnavailable} />
    </Canvas>
  );
}
