import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Respaldo temporal para pruebas; las imágenes van directo a Supabase Storage.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
