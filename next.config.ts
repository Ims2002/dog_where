import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // La app necesita cámara (foto) y geolocalización (ubicación del avistamiento), nada más.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Fotos ya comprimidas en el navegador (≤ MAX_PHOTO_BYTES). Vercel admite hasta 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Las fotos solo pueden venir de nuestro store de Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // El enlace de gestión lleva un secreto en la ruta: que no salga en el Referer.
      { source: "/gestionar/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
