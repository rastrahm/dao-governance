import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAO Governance — Module 10",
  description: "UI de gobernanza on-chain: perfiles, tema claro/oscuro, Timelock demo",
  icons: { icon: "/favicon.svg" },
};

const themeBootScript = `
(function(){
  try {
    var k='dao-theme';
    var t=localStorage.getItem(k);
    if(t!=='light'&&t!=='dark'){
      t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

/**
 * @description Layout raíz (Server Component) con boot de tema sin flash.
 * @param children Contenido de la ruta.
 * @returns HTML base de la app.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
