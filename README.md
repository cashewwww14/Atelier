# Atelier

An interactive portfolio. Four objects from a workshop laid out on a cream
field, with a small figure sitting in the middle. The objects *are* the
navigation — there is no menu.

```bash
npm run dev -- --port 3210    # port 3000 is taken by Grafana on this machine
npm run build
npm run typecheck
npm run lint
```

## Rules the build holds to

**Four 3D models, and no 3D background.** The cabin, the workbench, the rune
stone and the signpost. The figure in the centre is a 2D illustration —
it carries far more character than the model budget could have bought, and it
keeps the budget for the four objects that are actually navigation.

**One destination, one page.** Picking up an object routes to it; nothing
scrolls to a section of the same page.

**The 3D never restarts.** The canvas is mounted once in the root layout, so a
navigation is one continuous motion rather than two animations that happen to
look alike. Picking something up runs in three beats — it flies off the side of
the frame and fades (950ms), waits out of view while the next page mounts
(520ms), then swings back in from the opposite side and parks as that page's
backdrop, turning slowly as you scroll. Going back reverses it and every object
returns to its slot. State is in `src/lib/scene-state.tsx`; the five poses are
`HubItem.poseFor`.

| Route | What's there |
|---|---|
| `/` | The workshop — four objects and the figure |
| `/about` | History, education, the registered copyright |
| `/work` | Seven projects |
| `/work/[id]` | One project, with its interface running |
| `/craft` | The stack |
| `/contact` | Links |

The loading curtain runs **once per visit**, not once per mount — its flag is
module scope in `Preloader.tsx`. It lives inside the hub, so returning from a
section remounts it, and component-local state would drop the curtain over a
scene that has been loaded for minutes.

**The mockups run — they are not pictures.** Built from HTML, SVG, Web Audio,
WebGL and a real recommender. Every button works; every figure inside them is
invented sample data.

## Moditium plays real music

The recommender is the genuine article. It runs against **428 real tracks**
lifted from the same 114,000-row feature set the original was built on
(`cashewwww14/Spotify → dataset.csv`), stratified across the energy × valence
plane by `scripts/build-catalogue.mjs` so every mood stays reachable. Rules
narrow the field, CBR scores `0.7 × cosine + 0.3 × euclidean` over nine
weighted features, and a ranker adjusts the order. Push valence to 0.95 and the
results really do turn into *September* and *Pumped Up Kicks*.

### Real audio, with no account and no key

Every shipped track plays a genuine 30-second Apple preview with its real cover
art. This needs **no Apple Developer membership, no token, no sign-in** — the
iTunes Search endpoint is public, and it serves the same catalogue Apple Music
does.

`scripts/enrich-catalogue.mjs` resolves the whole catalogue against it ahead of
time, stores the preview and artwork URLs, and **drops any track it cannot match
confidently**. So the shipped list is playable end to end, artwork appears
instantly, and no lookup happens while someone is using the page.

Matching is stricter than search relevance, deliberately. Asking for
"Yonaguni" by Bad Bunny returns *NUEVAYoL* — right artist, wrong song — and a
title-only search turns up four different covers. So a candidate whose **title**
does not match is rejected outright however well the artist agrees, karaoke and
tribute pressings are penalised, and anything below 0.62 confidence is dropped
rather than shipped wrong. That single rule is the difference between a player
that works and one that plays the wrong song.

```bash
node scripts/build-catalogue.mjs <dataset.csv>   # pick 428 across the mood space
node scripts/enrich-catalogue.mjs                # match each to a real recording
```

**The enrichment run is slow on purpose and is meant to be repeated.** iTunes
Search rate-limits hard, and once tripped it returns 403 to everything for a
while — a first attempt at ~4 requests/second got the whole run blocked and
produced nothing. So it now waits 3.2s between lookups, sits out a 403 for 90s,
writes to disk every 10 tracks, and **resumes**: re-running only looks up what
is still missing. Expect roughly half an hour, and just run it again if it
stops early.

Nothing breaks while it is incomplete. A track without a baked preview is
resolved through `/api/preview` the moment it is played, and falls back to the
synthesiser if even that fails.

### The player in the corner

`NowPlaying.tsx` plays one track — set it in `src/data/music.ts` — from Apple's
public preview asset, through an `<audio>` element this app owns. It starts
itself, and has play/pause, volume and mute.

**Owning the element is what makes those controls possible**, and that is the
whole reason it is not Apple's embed iframe. The iframe plays the *full* song
for a signed-in listener, but it is cross-origin: nothing outside it can start
it, pause it, or touch its volume, because Apple exposes no API for that. Full
playback and real controls are mutually exclusive here, so there is a link out
to Apple Music for anyone who wants the whole thing.

Autoplay is honest about what browsers permit. Chrome and Safari refuse audio
until the visitor has interacted with the page, so it attempts playback on
mount and, if refused, arms a listener and starts at their first click, key
press or scroll. No prompt, no banner. Volume and mute persist in
`localStorage`, and because the widget lives in the root layout the audio is
never unmounted — playback carries across navigation.

There is no option here that plays a full commercial song to every visitor,
because none exists legally: a subscription grants a right to listen, never a
right to broadcast. A MusicKit build was tried and removed — it needs a paid
membership *and* a per-listener sign-in.

The Web Audio synthesiser is still there as the backstop: it plays the "hear
your mood" button, which has no recording by definition, and covers the case
where a preview URL fails. It builds sound from the same nine features — tempo
sets the clock, valence picks major or minor, energy opens the filter,
danceability decides how busy the rhythm is, acousticness swaps the timbre.

### The other six

- **Floor Socket 3D** is genuinely raw WebGL — hand-written matrices and a Phong
  fragment shader, no Three.js, exactly like the original. The light sliders
  move a real object.
- **MoMent** has four working tabs: scan a receipt, edit the result, save it, and
  the balance moves; split a bill and it totals per person.
- **e-Disiplin**, **CV Analyzer**, **Network KPI** and **News Portal** all filter,
  sort, select and change state.

## Colour

The palette is taken from the models, not invented beside them.

```bash
node scripts/sample-palette.mjs    # clusters the source textures in OKLab
node scripts/derive-palette.mjs    # lifts those hues to a light surface + checks contrast
```

The source textures are dark because they carry baked shadow — the oak that
reads `#7a6d5c` in the texture map is the same oak that reads `#f2ece4` as a
page. So hue and chroma are kept and only lightness is re-stepped, then every
pairing that carries text is checked: ink 15.2:1, body 11.7:1, muted 5.1:1
against the surface, every accent above 7:1.

## Assets

Source models live outside the repo, in
`/Users/ahmadzaky/Documents/Projects/Assets 3d/` (~700 MB). Almost all of that
weight is 4096×4096 PNG textures.

```bash
./scripts/optimize-assets.sh                        # 305 MB → 1.3 MB
node scripts/cutout-figure.mjs <render.png>         # flood-fills the backdrop away
```

The cutout flood-fills inward from the border rather than thresholding on
brightness — a threshold would also punch through the pale clock face and the
light page edges of the books.

Spare models (the stone well, the tool wall) are commented out in the optimise
script: still good, just no room inside the four-object budget.

## Layout

`src/data/hub.ts` holds every object's position, size and tilt as **fractions of
the visible viewport**, and the DOM labels are derived from those same numbers.

Three things already learned the hard way, worth not repeating:

- Positions must be **proportional, not absolute**. The camera's visible area
  grows with the window, so fixed world coordinates flung the four objects into
  the corners of a large screen and left a hole in the middle.
- Objects are normalised on their **longest axis**, not their height. The
  workbench is twice as wide as it is tall; matching heights made it swallow
  everything next to it while measuring the same.
- Labels live in a **DOM overlay**. Anchoring them in 3D meant deriving
  clearance from a bounding box that ignores tilt and parallax, and four labels
  at four depths never optically aligned.
- Never call `WEBGL_lose_context.loseContext()` in a React cleanup — the second
  mount gets a dead context and the canvas stays blank.
