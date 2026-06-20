import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brújula V2 - Finanzas personales",
    short_name: "Brújula",
    description:
      "Control mensual de ingresos, pagos, movimientos reales y salud financiera.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#030716",
    theme_color: "#34d399",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
