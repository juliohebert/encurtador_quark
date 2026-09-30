import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encurtador Quark",
  description: "Encurtador público de URLs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
