import type { MetadataRoute } from "next";

// Manifest do app instalável (PWA) — usado pelo navegador ao "Adicionar à tela inicial".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JR Joias Folheadas — Demandas",
    short_name: "Demandas JR",
    description: "Acompanhamento de demandas entre Estoque, Almoxarifado e Fundição.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#18181b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
