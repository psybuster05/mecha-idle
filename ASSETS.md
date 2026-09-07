# Asset provenance

Every art, audio, or font file in this repo must be listed here **before it is committed**,
with its source, author, and license. Reconstructing this later from memory is miserable,
and the moment anything is distributed, provenance has to be provable.

Only **CC0 / public domain** or assets we created ourselves. "Free to download" on itch.io
is frequently *not* CC0 - check the actual license text on each pack, every time.

| File / directory | Source URL | Author | License | Added |
|---|---|---|---|---|
| `public/favicon.svg` | Generated in-repo from `MECH_BASE` in `src/content/sprites.ts` | This project | Owned | 2026-09-07 |

The in-game art is not in this table because it is not files: sprites live as pixel data
in `src/content/sprites.ts`, authored here. That was a deliberate choice and it is why
this table is nearly empty. See the art rules in CLAUDE.md.

The favicon is the mech's head, cropped from the same sprite data and flattened to SVG
rects. If `MECH_BASE` ever changes, the favicon will not follow on its own.

## Fonts

Bundled locally only - no Google Fonts or other CDN links (offline requirement, see CLAUDE.md).

| File | Source | License |
|---|---|---|
| _(none yet)_ | | |
