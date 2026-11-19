# Portal website (buildwithportal.com)

## Design system

Read `design-system/README.md` before you build or change anything a person sees: a page, a component, copy, an email, an ad or a video. Then read the section for the job:

- `design-system/1-voice-and-claims.md` for any copy, and for every rating, number or credential.
- `design-system/2-photography.md` for any photo.
- `design-system/3-static-ads.md` for static ads.
- `design-system/4-video.md` for Reels, Shorts and Stories.
- `design-system/5-banned-patterns.md` before you call any visual work done.

Rules that apply to every change:

- Take colors, type sizes, spacing and radii from `design-system/tokens.json`. The Tailwind theme in `src/index.css` uses the same values under the same `portal-*` names. If you change one, change the other in the same PR.
- Use only Portal's own job photos. No stock and no AI images.
- Do not add eyebrows (small uppercase labels above headings), tinted icon squares, gradients, shadows or em dashes in copy.
- Write headlines, buttons and labels in sentence case.

## Changing the design system

1. Edit the files in `design-system/`.
2. If you changed `tokens.json`, run `node scripts/build-tokens-css.mjs` to rebuild `design-system/tokens.css`.
3. Republish the changed files to the Claude copy at https://claude.ai/artifact/5FRx2R8Pb1TroEN63G2mug in the same session. Each file goes to `project/<its path under design-system/>`. Images there are uploads, so previews point at `/_blob/<id>` paths; keep those paths as they are.
4. Open the PR with the change.
