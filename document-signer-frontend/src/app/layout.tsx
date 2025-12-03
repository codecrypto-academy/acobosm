// Archivo: src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Asegúrate de que esta línea exista

export const metadata: Metadata = {
  title: "ETH Document Signer",
  description: "dApp para registro de documentos en Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* CAMBIO CLAVE: Centramos y damos un fondo ligero al cuerpo de la página */}
      <body className="flex min-h-screen items-center justify-center p-8 bg-gray-100 font-sans">
        {children}
      </body>
    </html>
  );
}
