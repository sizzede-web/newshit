import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // Browser-Profil mit Login-Cookies nie in den Build übernehmen.
  outputFileTracingExcludes: { "*": [".social-profile/**"] },
};

export default nextConfig;
