import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quite Logic",
    short_name: "Quite Logic",
    description: "Calm, precise software.",
    start_url: "/",
    display: "standalone",
    background_color: "#4B5560",
    theme_color: "#303944",
    icons: [{ src: "/logo/icon.png", sizes: "1254x1254", type: "image/png" }],
  };
}
