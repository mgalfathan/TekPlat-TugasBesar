/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crests.football-data.org",
      },
      { protocol: "https", hostname: "cdn.sofifa.net" },
      { protocol: "https", hostname: "cdn.sofifa.com" },
    ],
  },
};

module.exports = nextConfig;
