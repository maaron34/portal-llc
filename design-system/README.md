Portal is a concrete contractor based in West Seattle, run by Chris Hildebrand. The crew builds driveways, patios, front steps, walkways, retaining walls and foundations, and repairs old concrete. Everything Portal publishes should look like it came from that crew: real job photos, warm grays, one green, heavy plain type, and the hand-cut logo as the only decorative lettering.

This system covers the website, static ads, short video, email and social posts. Read this page first, then the section for what you are making.

## How to use this system

- Take every color from `tokens.json` by name. Take sizes and spacing from `tokens.json` and from the tables in each section. If a value you need is missing, ask before adding one.
- Use the **light** theme for web pages, email and print. Use the **dark** theme for the static-ad text panel, the video end card and any dark band.
- Use only the logos and photos in Assets, or other real Portal job photos from the website repo (maaron34/portal-llc, `public/images/`).
- Check every claim against Voice and claims before it ships.
- Check the finished piece against Banned patterns.

## Logo

- Put `portal-logo-black.png` on white, cream and light photos. Put `portal-logo-white.png` on `portal-charcoal`, `portal-dark` and dark photos. Those are the only two versions.
- The logo is a hand-cut woodcut wordmark with a spiral in the O. Never redraw, trace, outline, recolor, stretch, rotate or add effects to it.
- Never set the word "Portal" in a font that imitates the logo. In running text, write Portal in the text face.
- Keep clear space around the logo equal to the height of its "SEATTLE CONCRETE" line.
- Keep the logo at least 120px wide on screen so "SEATTLE CONCRETE" stays readable.
- `portal-spiral.png` is the spiral on its own. Use it for the favicon, a profile picture and the slow-turning watermark behind the hero logo at `opacity-watermark`. It is only 224px wide, so never show it larger than that.
- No vector logo exists yet. The largest file is a 3073px PNG. Get the original artwork from Chris before any print job larger than a letter page.

## Color

- The palette is warm grays and one green. Grays carry the page; green marks the thing to do and the finished result.
- Use `accent-fill` with `on-accent` text for buttons, the Free estimate badge and the AFTER tag. Use `accent-fill-pressed` for hover and pressed states.
- Never fill a whole background, a band or a large shape with green.
- Set headlines in `ink`, body copy in `ink-body`, review text and nav links in `ink-soft`, and secondary text in `ink-muted`, all on `surface` or `surface-alt`.
- Set green text, links and icons in `accent-ink`. It switches to `portal-accent-light` in the dark theme because the brand green reads at only 2.7:1 on charcoal.
- Use `portal-star` for star ratings and nothing else. Use `portal-error` for form errors and nothing else.
- Put text on a photo only inside a `portal-scrim` box (ads and video) or on the bottom gradient of a ServiceTile (website). Never put bare text on a photo.
- Do not reuse the amber "year-round" callout or the pink-to-purple Instagram button from the current website in new work. They are the only off-palette colors on the site.

## Type

- Use one family: Inter, from Google Fonts, weights 400 to 900.
- Set headlines heavy and tight: 800 on the website, 900 with -0.02em tracking in ads and video.
- Write every headline, button, caption and label in sentence case. The only all-caps text is the BEFORE and AFTER photo tags.
- Set web body copy in `web-body` (16px on 26px) and keep lines under about 70 characters.
- Set customer quotes in `web-quote` (italic). A PullQuote puts the author upright in `accent-ink`; a ReviewCard puts the author in `ink`.
- Never add a second typeface, a script, or a distressed or stencil font. The logo is the brand's only expressive lettering.

## Layout and spacing

- Use the 4px steps in `tokens.json`. Sections get `space-20` above and below on phones and `space-28` from 640px wide.
- Center content in a 1152px column with `space-4` side gutters on phones and `space-6` from 640px. Long text and FAQs use a 768px column.
- Alternate `surface` and `surface-alt` bands down a page. Use one dark band per page at most.
- Use `radius-lg` for photos and cards, `radius-md` for buttons, and `radius-pill` for the Free estimate badge and area chips.
- Use no drop shadows. Separate things with bands, `line` hairlines and space.
- Let photos run large. A section with one strong photo beats a grid of six small ones.

## Motion

- On the website, sections fade in and rise 24px once over `duration-reveal`, and the spiral watermark turns once every `duration-spiral`. Both stop for people who set reduced motion.
- In video, each photo zooms slowly by 8%, scenes change with a crossfade or a left wipe over `duration-transition`, and captions fade in over `duration-caption-fade`.
- Nothing bounces, flies in, shakes or flashes.

## Icons

- Use Lucide icons (lucide.dev) at their default 2px stroke, 16 to 24px, in `accent-ink` or `ink-muted`.
- The website uses Phone, Star, CheckCircle, ArrowRight, ShieldCheck, MessageSquare, HandCoins, CloudRain, Instagram and Facebook. Reuse those before adding new ones.
- Draw star ratings as five Lucide stars filled with `portal-star`.
- Never use emoji in Portal's own copy or design.

## Formats

| Asset | Size | Theme | Section |
| --- | --- | --- | --- |
| Website | 360px to 1440px wide | Light | This page |
| Static ad, square | 1200 x 1200 | Dark panel | Static ads |
| Static ad, portrait | 960 x 1200 | Dark panel | Static ads |
| Static ad, wide | 1200 x 628 | Dark panel | Static ads |
| Reel, Short, Story | 1080 x 1920, 30 fps | Dark end card | Video |
| Email | 600px wide | Light | This page |

There are no print specs yet (yard signs, door hangers, truck lettering). Print needs the vector logo first.

## Working outside Claude

- The same files live in the website repo at [github.com/maaron34/portal-llc/tree/master/design-system](https://github.com/maaron34/portal-llc/tree/master/design-system), with the logos and photos as normal image files.
- `tokens.json` holds every value. `components/bundle.css` expects the tokens as CSS variables (`--portal-accent`, `--space-4` and so on); `design-system/tokens.css` in the repo has them ready for both themes.
- Load Inter from Google Fonts at weights 400 to 900.
