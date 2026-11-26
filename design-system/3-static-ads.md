# Static ads

A Portal static ad is a real job photo on top and a charcoal text panel underneath. The panel holds one headline, one supporting line, five yellow stars with the rating, the white logo and the Free estimate badge. The AdStatic component shows the build, and the Examples group shows the November 2026 batch.

## Sizes

| Format | Size | Photo area | Panel padding | Panel gap | Headline | Sub line | Proof | Stars | Badge | Above proof row | Above footer | Logo height | Tag | Tag inset |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Square | 1200 x 1200 | Top 60% | 44px | 14px | 64px | 32px | 32px | 34px | 44px | 28px | 40px | 96px | 26px | 22px |
| Portrait | 960 x 1200 | Top 58% | 40px | 14px | 58px | 30px | 30px | 32px | 42px | 28px | 38px | 90px | 24px | 20px |
| Wide | 1200 x 628 | Left 56% | 32px | 10px | 40px | 23px | 22px | 24px | 30px | 20px | 26px | 66px | 20px | 16px |

Deliver each ad as a PNG and a JPG (quality 90). Make a clean version of each size with no text or logo as well. Google Performance Max wants one per aspect ratio, and Search image assets do not allow text overlays.

## Layout

- Fill the photo area with one photo, or a before/after pair split by a 6px `portal-dark` gap.
- Place the BEFORE tag (`portal-scrim`) and the AFTER tag (`accent-fill`) in the top-left corner of each photo, at the tag inset in the table.
- Fill the panel with `portal-charcoal`. Set the headline in `ad-headline`, white. Set the sub line in `ad-sub`, `portal-light`.
- The two "above" columns are the full space between blocks, panel gap included.
- Under the sub line, run a proof row: five `portal-star` stars (3px apart), then the Google rating line in `ad-proof`, `portal-light`, left-aligned. In the wide size the line may wrap under the stars.
- Under the proof row, run a footer row: the white logo on the left and the CtaBadge on the right, centered on each other.
- Leave the URL off the image. The platform shows the link.
- Use one headline and one sub line. No lists, no prices, no second call to action.
- Never repeat the rating. When the sub line would only restate it, drop the sub line and let the proof row carry it.
- Never let a line break inside a hyphenated word such as year-round. Use a non-breaking hyphen (U+2011) in headlines.
- Never leave one word alone on the last line of a headline or sub line. When text runs to two lines, give the lines a similar number of words. Set the break by hand instead of letting the text wrap on its own. Example: "Seattle winter? / We pour year-round." and never "Seattle winter? We pour year- / round."

## Copy pattern

The headline names the problem or the job. The sub line says what Portal does about it. A bare proof point (a rating, a number of years) never stands alone as the headline; lead with the job and put the proof under it.

| Headline | Sub line |
| --- | --- |
| Crumbling front steps? | We replace them with new concrete. |
| Old steps out. New steps in. | Front steps rebuilt in concrete. |
| Seattle winter? We pour year-round. | We tent the pour to keep the rain off. |
| Concrete retaining walls | For Seattle's sloped yards. |
| Got a concrete job? | No sub line. The proof row carries the rating. |
| Need a concrete contractor? | Family-owned. Owner Chris has 35+ years in construction. Licensed, bonded and insured. |

## Before an ad goes live

- Check every claim against Voice and claims.
- Look at the ad at phone size, about 360px wide. If the sub line is hard to read, cut words instead of shrinking the type.
- Open the landing page in a browser. The website returns a normal page for missing addresses, so a typo in the URL still looks like it works.
- Get sign-off before anything goes live. Launching an ad changes spend.
