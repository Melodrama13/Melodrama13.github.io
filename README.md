# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Local other_source sync

This project supports a local-only songs sync pipeline from `other_source/`.

- The `other_source/` folder is gitignored and will not be committed.
- Put the following six files in `other_source/` root:
	- `musics.json`
	- `musicDifficulties.json`
	- `musicTags.json`
	- `musicVocals.json`
	- `gameCharacters.json`
	- `outsideCharacters.json`
- The sync script stitches them into `public/data/pjsk_songs.json`.
- You can auto-fetch these six files from `sekai-master-db-diff`:

```bash
npm run fetch:other-source
```

- Preview fetch changes without writing files:

```bash
npm run fetch:other-source:dry
```

- Run sync:

```bash
npm run sync:other
```

- Preview changes without writing files:

```bash
npm run sync:other:dry
```

### Diff behavior

- The script compares newly stitched songs with the existing `public/data/pjsk_songs.json` by song `id`.
- It reports `added`, `removed`, and `updated` song IDs.
- On normal run, changes are fully synced to `public/data/pjsk_songs.json`.
- On dry-run, changes are only reported.

## Song jacket sync (incremental)

This project can sync song jackets from sekai.best into local static assets under `public/songs/`.

- Source songs list: `public/data/pjsk_songs.json`
- Target directory: `public/songs`
- Manifest file: `public/songs/manifest.json`
- Local file naming: `song_<id>.webp` (for example `song_001.webp`)

Run sync:

```bash
npm run sync:song-covers
```

Dry-run (comparison only, no file write):

```bash
npm run sync:song-covers:dry
```

Optional flags:

- `--force`: redownload all jackets.
- `--prune`: remove stale local jacket files that are not in songs data.
- `--concurrency <n>`: set concurrent requests (default 8, max 16).
- `--timeout <ms>`: set per-request timeout in milliseconds (default 20000).

## Cards sync (incremental by default)

Cards can be synced from `other_source/cards.json` into `public/data/pjsk_cards.json` by `CardID`.

- Fields synced by rule: `Name`, `CardName`, `Rarity`, `Attribute`, `Skill`, `Bundle`.
- Default behavior is non-destructive incremental:
	- fill missing fields (including missing `Bundle` on old cards),
	- append new cards,
	- report conflicts without overwriting existing values.
- To force overwrite conflicting fields, pass `--overwrite-existing`.

Run sync:

```bash
npm run sync:cards-other
```

Dry-run with conflict report:

```bash
npm run sync:cards-other:dry
```

## Card thumbnail sync (card ID naming)

Card thumbnails are synced from sekai.best into `public/cards/` from local `public/data/pjsk_cards.json` (`Bundle` field), using card-id file names:

- normal: `card<id>.webp` (example: `card251.webp`)
- after training: `card<id>_t.webp` (example: `card4_t.webp`)

Files are stored in character subfolders:

- `public/cards/<char-folder>/card<id>.webp`
- `public/cards/<char-folder>/card<id>_t.webp`

where `<char-folder>` follows `001ick` style.

Rules:

- 1★ / 2★ / birthday cards: sync normal only (`_normal` remote suffix).
- 3★ / 4★ cards: sync normal + after training.
- special case `CardID=1167`: only sync `_t` image.

Run sync:

```bash
npm run sync:card-thumbnails
```

Dry-run:

```bash
npm run sync:card-thumbnails:dry
```
