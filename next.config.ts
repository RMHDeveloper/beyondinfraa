import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp as a real native dependency (not bundled by Turbopack) so its
  // platform binary is traced and included correctly in the serverless output.
  serverExternalPackages: ["sharp"],
  // Output file tracing misses sharp's native .node/.so binaries by default;
  // force them into the deployed function bundle explicitly.
  outputFileTracingIncludes: {
    "/api/projects/[id]/marketing-ppt": [
      "./node_modules/@img/sharp-linux-x64/**",
      "./node_modules/@img/sharp-libvips-linux-x64/**",
    ],
  },
};

export default nextConfig;
