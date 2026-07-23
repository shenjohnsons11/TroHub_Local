import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";

import "./globals.css";
import { NotificationProvider } from "@/providers/notification-provider";

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
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#f37021" showSpinner={false} />
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
