/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // Permite orice imagine externă (OLX, Storia, etc.)
    ],
  },
};

export default nextConfig;
