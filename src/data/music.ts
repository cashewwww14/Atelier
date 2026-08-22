/**
 * The one track in the corner of the site.
 *
 * Played from Apple's public preview asset through an `<audio>` element this
 * app owns, rather than Apple's embed iframe. That choice is forced, not
 * stylistic: the iframe is cross-origin, so there is no way to start it, pause
 * it, or touch its volume from the page around it — Apple exposes no API for
 * that. Wanting autoplay and a volume control means owning the audio element.
 *
 * What that costs: 30 seconds, looped, instead of the full track. Full-length
 * playback is only ever available to a listener signed in with their own
 * subscription, which is exactly the login this is meant to avoid. The two are
 * mutually exclusive, so there is a link out to Apple Music for anyone who
 * wants the whole thing.
 *
 * The URLs are Apple's own and are resolved by `scripts/enrich-catalogue.mjs`'s
 * lookup; re-run that query if the asset ever moves:
 *   https://itunes.apple.com/search?term=<song>&entity=song&limit=1
 */
export const music = {
  title: "anything",
  artist: "Adrianne Lenker",
  album: "songs",

  /** Apple's public 30-second preview. No key, no account, no sign-in. */
  src: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/17/b9/7d/17b97d21-5b90-980b-26fd-5df5e888a7a2/mzaf_14920702728886256522.plus.aac.p.m4a",

  artwork:
    "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/70/f0/a6/70f0a6a5-cd71-9da2-174b-41927d331cdd/cover.jpg/300x300bb.jpg",

  /** Where to hear the whole song. */
  appleUrl: "https://music.apple.com/us/album/anything/1526437437?i=1526437442",

  /** Quiet by default — background music that arrives loud is an ambush. */
  defaultVolume: 0.35,
} as const;
