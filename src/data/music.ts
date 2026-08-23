/**
 * The track in the corner of the site.
 *
 * Played through YouTube's official embed, which is the only route that gives
 * the whole song legally. The two alternatives both failed on something:
 * Apple's public preview is thirty seconds on a loop, and the SoundCloud
 * upload carries a `BLOCK` policy for Indonesia, so most of this site's
 * visitors — and its author — would get nothing at all.
 *
 * This upload is the artist's own channel, embedding is enabled on it, and it
 * is cleared for 249 countries including Indonesia. Verified, not assumed.
 *
 * Two consequences worth knowing before changing any of this:
 *
 *  - **The player has to stay visible.** YouTube's API terms forbid hiding the
 *    embed or using it as a detached audio source, so this is a small video in
 *    the corner rather than the invisible `<audio>` element it replaced.
 *  - **Sound needs a gesture.** No browser will start audio unmuted on its
 *    own. The opening curtain collects that click, which is exactly why it is
 *    a door rather than a timer.
 */
export const music = {
  title: "not a lot, just forever",
  artist: "Adrianne Lenker",
  album: "songs",

  /** Official audio on the artist's own channel. */
  videoId: "Hsl9IZxxY0I",
  watchUrl: "https://www.youtube.com/watch?v=Hsl9IZxxY0I",

  /** Quiet by default — background music that arrives loud is an ambush. */
  defaultVolume: 0.35,
} as const;
