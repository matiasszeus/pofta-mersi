import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets other devices on the home network (e.g. a phone) load the
  // dev server. Wildcard because the router may hand this PC a different address.
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;
