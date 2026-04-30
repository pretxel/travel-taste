/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase storage signed URLs are served from the project subdomain.
      // The exact hostname is set per environment via NEXT_PUBLIC_SUPABASE_URL.
      // We allowlist the wildcard here; Next.js validates against the configured URL at build time.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
