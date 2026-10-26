/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" }
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [...securityHeaders];
    // Only send HSTS in production. Avoid pinning localhost or preview hosts.
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000"
      });
    }
    return [{ source: "/:path*", headers }];
  }
};

export default nextConfig;
