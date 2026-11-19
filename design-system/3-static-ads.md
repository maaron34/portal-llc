# Static ads

A Portal static ad is a real job photo on top and a charcoal text panel underneath. The panel holds one headline, one supporting line, the white logo, the rating and the Free estimate badge. The AdStatic component shows the build, and the Examples group shows the November 2026 batch.

## Sizes

| Format | Size | Photo area | Panel padding | Panel gap | Headline | Sub line | Proof | Badge | Logo height | Tag | Tag inset |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Square | 1200 x 1200 | Top 64% | 44px | 14px | 64px | 32px | 27px | 32px | 96px | 26px | 22px |
| Portrait | 960 x 1200 | Top 62% | 40px | 14px | 58px | 30px | 25px | 30px | 90px | 24px | 20px |
| Wide | 1200 x 628 | Left 58% | 34px | 10px | 42px | 24px | 21px | 23px | 70px | 20px | 16px |

Deliver each ad as a PNG and a JPG (quality 90). Make a clean version of each size with no text or logo as well. Google Performance Max wants one per aspect ratio, and Search image assets do not allow text overlays.

## Layout

- Fill the photo area with one photo, or a before/after pair split by a 6px `portal-dark` gap.
- Place the BEFORE tag (`portal-scrim`) and the AFTER tag (`accent-fill`) in the top-left corner of each photo, at the tag inset in the table.
- Fill the panel with `portal-charcoal`. Set the headline in `ad-headline`, white. Set the sub line in `ad-sub`, `portal-light`.
- Run a footer row along the bottom of the panel: the white logo on the left, then the proof line (`ad-proof`, `portal-light`) above the CtaBadge on the right.
- Leave the URL off the image. The platform shows the link.
- Use one headline and one sub line. No lists, no prices, no second call to action.
- When the headline is the rating itself, drop the proof line from the footer.
- Never let a line break inside a hyphenated word such as year-round. Use a non-breaking hyphen (U+2011) in headlines.
- Never leave one word alone on the last line of a headline or sub line. When text runs to two lines, give the lines a similar number of words. Set the break by hand instead of letting the text wrap on its own. Example: "Seattle winter? / We pour year-round." and never "Seattle winter? We pour year- / round."

## Copy pattern

The headline names the problem or the job. The sub line says what Portal does about it.

| Headline | Sub line |
| --- | --- |
| Crumbling front steps? | We replace them with new concrete. |
| Old steps out. New steps in. | Front steps rebuilt in concrete. |
| Seattle winter? We pour year-round. | We tent the pour to keep the rain off. |
| Concrete retaining walls | For Seattle's sloped yards. |
| 35+ years experience | Licensed, bonded and insured. Based in West Seattle. |

## Before an ad goes live

- Check every claim against Voice and claims.
- Look at the ad at phone size, about 360px wide. If the sub line is hard to read, cut words instead of shrinking the type.
- Open the landing page in a browser. The website returns a normal page for missing addresses, so a typo in the URL still looks like it works.
- Get sign-off before anything goes live. Launching an ad changes spend.
