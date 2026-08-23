import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter, Karla } from "next/font/google";
import { SceneRoot } from "@/components/canvas/SceneRoot";
import { Foliage } from "@/components/ui/Foliage";
import { NowPlaying } from "@/components/ui/NowPlaying";
import { SceneProvider } from "@/lib/scene-state";
import { profile } from "@/data/profile";
import "./globals.css";

// Old-world and bookish, to sit with marble, carved wood and paper. Fraunces
// was the previous display face; its wobble read as playful rather than made.
const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  display: "swap",
});

// Warmer than Inter in the body, with a little grotesque character. Inter
// stays loaded because the app mockups are reconstructions and their own
// interfaces are what makes them convincing.
const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description:
    "An interactive portfolio: a workshop laid out on a cream field, holding systems that were built and used.",
  openGraph: {
    title: `${profile.name} — ${profile.role}`,
    description: "An interactive portfolio.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9f6f1",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable} ${karla.variable}`}>
      <body className="antialiased">
        {/* The scene and the drifting leaves are mounted once, above the root
            background and beneath every page. Navigation changes only what is
            drawn on top of them, which is what lets an object fly out of the
            hub and still be the same object when its page opens. */}
        <SceneProvider>
          <Foliage />
          <SceneRoot />
          {/* Transparent to the pointer by default. This layer covers the whole
              viewport, and an element with `pointer-events: auto` hit-tests
              across its entire box whether or not it paints anything — which
              silently swallowed every hover meant for the 3D objects beneath.
              Pages re-enable it on the parts that are actually interactive. */}
          <div className="pointer-events-none relative z-10">{children}</div>
          <NowPlaying />
        </SceneProvider>
      </body>
    </html>
  );
}
