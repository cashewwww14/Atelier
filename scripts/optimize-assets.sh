#!/usr/bin/env bash
# Optimize raw AI-generated GLB assets for the web.
#
# Source assets live outside the repo (~700MB total): each is low-poly or
# photogrammetry-dense geometry wrapped in 4096x4096 PNG PBR textures.
# The textures are the real weight, so the pipeline is: cap resolution,
# recompress to WebP, then meshopt the geometry. Dense scans get simplified
# first via an explicit per-asset ratio.
#
# Usage: ./scripts/optimize-assets.sh
set -euo pipefail

SRC="/Users/ahmadzaky/Documents/Projects/Assets 3d"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/models"
GT="npx --yes @gltf-transform/cli@4.4.2"
TEX_SIZE=1024

mkdir -p "$OUT"

# "<source name>|<output slug>|<simplify ratio, 0 = skip simplify>"
#
# The scene ships four models plus the figure — five total, by design. The two
# entries at the bottom are commented-out spares: both are good assets that the
# current narrative has no room for. Uncomment to regenerate one.
ASSETS=(
  "Kabin bengkel|kabin-bengkel|0"
  "Meja kerja|meja-kerja|0"
  "Batu rune|batu-rune|0.10"
  "Tiang penunjuk|tiang-penunjuk|0.05"
  # "Dinding perkakas|dinding-perkakas|0"
  # "Sumur batu|sumur-batu|0.10"
)

for entry in "${ASSETS[@]}"; do
  IFS='|' read -r name slug ratio <<< "$entry"
  src="$SRC/$name.glb"
  dst="$OUT/$slug.glb"

  if [[ ! -f "$src" ]]; then
    echo "!! missing: $src" >&2
    continue
  fi

  args=(--compress meshopt --texture-compress webp --texture-size "$TEX_SIZE")
  if [[ "$ratio" == "0" ]]; then
    # Already decimated upstream; simplifying again only loses silhouette.
    args+=(--simplify false)
  else
    args+=(--simplify true --simplify-ratio "$ratio" --simplify-error 0.005)
  fi

  echo "==> $name -> $slug.glb (ratio=$ratio)"
  $GT optimize "$src" "$dst" "${args[@]}" >/dev/null 2>&1 || {
    echo "!! failed: $name" >&2
    continue
  }

  before=$(du -m "$src" | cut -f1)
  after_kb=$(du -k "$dst" | cut -f1)
  echo "    ${before}MB -> $(( after_kb / 1024 )).$(( (after_kb % 1024) * 10 / 1024 ))MB (${after_kb}KB)"
done

echo
echo "Done. Output in $OUT"
ls -lh "$OUT"
