import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets other devices on the home network (e.g. a phone) load the
  // dev server. Wildcard because the router may hand this PC a different address.
  allowedDevOrigins: ["192.168.1.*"],

  // Fonts and pictures change rarely: browsers may keep them for a week
  // without asking (and for a month more while quietly checking for a new
  // version), so a second visit loads them from the phone itself. Their file
  // names do not change with their content, hence not "forever".
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/fonts/:path*", headers: cache },
      { source: "/images/:path*", headers: cache },
      { source: "/videos/:path*", headers: cache },
    ];
  },
};

export default nextConfig;
