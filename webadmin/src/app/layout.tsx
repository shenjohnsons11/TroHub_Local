import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "sweetalert2/dist/sweetalert2.min.css";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ExtensionNoiseFilter } from "@/components/extension-noise-filter";

const themeScript = `(function(){var t;try{t=localStorage.getItem("trohub_theme");if(t==="undefined"||t==="null")t=null}catch(e){}var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)})()`;

export const metadata: Metadata = {
  title: "TRO HUB - Quản lý nhà trọ",
  description: "Quản lý phòng, hợp đồng, hóa đơn và người thuê trong một hệ thống thống nhất.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
      style={{ backgroundColor: "#04100e" }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ExtensionNoiseFilter />
        <NextTopLoader color="#0e806d" showSpinner={false} />
        <LanguageProvider>
          <ThemeProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
