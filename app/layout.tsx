import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clara Fluxo — Controle de caixa simples",
  description: "Entradas, saídas e parcelamentos organizados mês a mês.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
