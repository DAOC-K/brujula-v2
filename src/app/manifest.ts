import type { MetadataRoute } from "next";

type BrújulaManifest = MetadataRoute.Manifest & {
  id?: string;
  screenshots?: {
    src: string;
    sizes: string;
    type: string;
    form_factor?: "wide" | "narrow";
    label?: string;
  }[];
};

export default function manifest(): BrújulaManifest {
  return {
    id: "/dashboard",
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
    screenshots: [
      {
        src: "/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Dashboard financiero de Brújula en escritorio",
      },
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Dashboard financiero de Brújula en móvil",
      },
    ],
  };
}
