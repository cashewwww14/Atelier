import { NextResponse } from "next/server";
import { developerToken, hasMusicKit } from "@/lib/apple-music";

/**
 * Hand MusicKit JS a developer token.
 *
 * The token is supposed to reach the browser — it is what MusicKit
 * authenticates with — but it is short-lived and derived, and the `.p8` key it
 * is signed from stays on the server. When no credentials are configured this
 * returns 501 and the player simply does not appear.
 */
export async function GET() {
  if (!hasMusicKit()) {
    return NextResponse.json(
      {
        error: "musickit-not-configured",
        detail:
          "Set APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY in .env.local to enable the player.",
      },
      { status: 501 },
    );
  }

  try {
    return NextResponse.json(
      {
        token: developerToken(),
        playlistId: process.env.NEXT_PUBLIC_APPLE_PLAYLIST_ID ?? null,
        storefront: process.env.APPLE_STOREFRONT ?? "us",
      },
      // Tokens last 12 hours; let the edge hold one for an hour.
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "token-failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
