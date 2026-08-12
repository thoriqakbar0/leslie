import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

// oxlint-disable-next-line react/only-export-components -- Next.js requires metadata beside the layout.
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const description =
    "A calm, local-first macOS work log for planning what matters and recording what actually happened.";

  return {
    title: "Leslie — Make peace with what got done",
    description,
    icons: {
      icon: "/leslie-app-icon.png",
      apple: "/leslie-app-icon.png",
    },
    openGraph: {
      title: "Make peace with what got done.",
      description,
      type: "website",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 630,
          alt: "Leslie — Make peace with what got done",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Make peace with what got done.",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
