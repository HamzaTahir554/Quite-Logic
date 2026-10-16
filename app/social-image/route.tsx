import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const title = (
    new URL(request.url).searchParams.get("title") || "Calm, precise software."
  ).slice(0, 100);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#303944",
        color: "#F0F1F8",
        padding: 80,
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", fontSize: 32 }}>
        <span style={{ color: "#F0F1F8" }}>Quite</span>
        <span style={{ color: "#2F80FE", marginLeft: 8 }}>Logic</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 78,
          letterSpacing: -4,
          maxWidth: 1000,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#91bdff" }}>
        Thoughtful engineering. Intelligent systems.
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
