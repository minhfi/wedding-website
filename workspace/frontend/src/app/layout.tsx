import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Noto_Serif_Display } from "next/font/google";
import "./globals.css";

const notoSerifDisplay = Noto_Serif_Display({
  variable: "--font-noto-serif-display",
  weight: ["200", "300"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  weight: ["400", "500"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phi & Ngân — 17.01.2027",
  description:
    "Thiệp cưới Minh Phi và Mỹ Ngân — Chủ nhật, 17.01.2027. Xác nhận tham dự và đăng ký xe khách.",
};

export const viewport: Viewport = {
  themeColor: "#FBFAF5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${notoSerifDisplay.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
