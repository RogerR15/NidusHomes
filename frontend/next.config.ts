/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // Permite orice imagine externă (OLX, Storia, etc.)
    ],
  },
};

export default nextConfig;
