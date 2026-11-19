The static ad layout: a real job photo on top (or on the left in the wide size) and a charcoal panel with headline, sub line, logo, rating and Free estimate badge.

## Use it for
- Google Demand Gen, Performance Max and Meta feed placements, at 1200 x 1200, 960 x 1200 and 1200 x 628.

## The consumer provides
- One photo or a BeforeAfter pair, a headline, a sub line, and a crop point for the photo.

## Rules
- Follow the size table in Static ads exactly: photo share, panel padding (`ad-panel-pad`), gaps, logo height, tag inset and type sizes all change with the format. The preview shows all three formats.
- Panel is `portal-charcoal` in every theme. Headline white `ad-headline`, sub line `portal-light` `ad-sub`.
- Footer: white logo left; `ad-proof` line above the CtaBadge right.
- No URL, no price, no second call to action. Ship a clean, text-free version of every size too.
- The batch-1 build script (`render_static.py` in the Portal ads folder) matches these sizes but uses a 0.82 scrim. Switch it to `portal-scrim` (0.85) for the next batch.
