import type { NextConfig } from "next";
const config: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  logging: { incomingRequests: { ignore: [/\/api\/admin\/gmail\/callback/] } },
};
export default config;
