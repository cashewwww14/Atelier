import { NextResponse } from "next/server";
import { findPreview, hasMusicKit } from "@/lib/apple-music";

/**
 * Resolve one dataset track to a real Apple recording.
 *
 * Works with no configuration at all — the iTunes Search endpoint is public —
 * so previews and cover art are on by default. A MusicKit developer token, if
 * present, is used instead for better matching.
 *
 * Deliberately thin: the recommender runs in the browser against the shipped
 * feature set, and only the winning tracks are looked up here.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ error: "title and artist are required" }, { status: 400 });
  }

  try {
    const result = await findPreview(title, artist);

    if (!result) {
      // Found nothing confident enough to be the right recording. Saying so is
      // better than handing back a karaoke version.
      return NextResponse.json(
        { error: "no-confident-match", source: hasMusicKit() ? "musickit" : "itunes" },
        { status: 404, headers: { "Cache-Control": "public, max-age=86400" } },
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "lookup-failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
