import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local, bundled brand-logo SVGs only (public/logos) — safe to allow.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
