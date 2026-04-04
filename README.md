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
