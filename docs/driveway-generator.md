# Driveway Generator

A homeowner adds a photo of their old concrete, says what it is, leaves a name and mobile number, waits about a minute, and sees their own photo with new plain gray concrete in a before/after slider. Then "Get a free estimate".

- Page: `/driveway-generator` (`src/pages/DrivewayGenerator.tsx`). Not linked from the site, not in the sitemap, marked noindex.
- Server: `netlify/functions/driveway-start.ts`, `driveway-worker.ts` (background), `driveway-status.ts`. The logic is in `netlify/lib/driveway-core.ts`.
- Product name: one constant, `PRODUCT_NAME` in `src/lib/driveway-shared.ts`.
- Off until `DRIVEWAY_GENERATOR_ENABLED` is set.

## Turn it on

1. Run `supabase/driveway-generator.sql` once in the Supabase SQL editor for the Portal project. It adds two tables and five functions. It changes no existing table; one function appends a file entry to a lead's `raw.files`.
2. In Netlify, add `OPENAI_IMAGE_API_KEY` to the site's environment variables. Scope it to Functions.
3. Add `DRIVEWAY_GENERATOR_ENABLED` = `1`.
4. Deploy. Environment variable changes take effect on the next deploy.
5. To turn it off, remove `DRIVEWAY_GENERATOR_ENABLED` and deploy. The page then shows "The generator is switched off right now".

## Environment variables

| Name | Needed | Default | What it does |
| --- | --- | --- | --- |
| `DRIVEWAY_GENERATOR_ENABLED` | To turn it on | off | `1` turns the page and the three functions on. |
| `OPENAI_IMAGE_API_KEY` | Yes | none | OpenAI key for image edits. Server only. Without it no picture is made and nothing is charged. |
| `OPENAI_IMAGE_MODEL` | No | `gpt-image-2.5-sunburst` | The image model. |
| `OPENAI_IMAGE_QUALITY` | No | `high` | Sent as `quality`. |
| `OPENAI_IMAGE_OUTPUT_FORMAT` | No | not sent | Set to `jpeg` to ask for a JPEG answer. Not tried live yet; the default (a PNG answer, converted on the server) is the tried path. |
| `OPENAI_IMAGE_TIMEOUT_MS` | No | `150000` | How long one image call may take. |
| `DRIVEWAY_DAILY_CAP` | No | `40` | Paid image calls per day, retries included. Seattle time. |
| `DRIVEWAY_MAX_PER_PHONE_PER_DAY` | No | `3` | Pictures per phone number per day. |
| `DRIVEWAY_MAX_PER_IP_PER_DAY` | No | `8` | Pictures per internet address per day. |
| `SUPABASE_SECRET_KEY` | Already set | | Jobs, counters and storage. |
| `LEAD_LINK_SECRET` | Already optional | Supabase secret | Signs the job token the page holds. |

## How the money is protected

- Every paid call is counted in Postgres (`driveway_days.calls`) before it is made. The count goes up in one statement that refuses to pass the cap, and Postgres runs those one at a time. A count is never given back.
- A job makes at most two calls: the first try and one retry.
- A double tap, a refresh, or a re-send carries the same request key and gets the same job.
- The worker claims a job before it calls the model, so a message delivered twice runs once.
- A request over a limit makes no job and no call. The homeowner's photo still goes on the lead.
- A job made just before midnight and run just after is counted against the new day, or closed without a call if that day is full.
- A lead holds at most 15 generator photos (its 10 upload slots and 5 more), so a refused request cannot be used to fill storage.
- Set a monthly budget on the OpenAI project as a second lock.

## The geometry gate

The model sometimes moves the camera. `netlify/lib/driveway-gate.ts` compares the photo and the result block by block and rejects a result whose frame shifted, zoomed, rotated or changed shape. A rejected result is never shown; the job tries once more, then shows the failure screen.

Measured on 2026-11-24 with `npm test` (fixtures in `netlify/lib/__tests__/fixtures/`):

| Case | Count | Gate said |
| --- | --- | --- |
| Real edits that kept the frame (4 photos, 2 models, 2 prompts) | 10 | 10 passed. False rejects: 0 of 10. |
| Real edits that reframed or came back in the wrong shape | 3 | 3 rejected. False accepts: 0 of 3. |
| The photo handed back with nothing replaced | 5 | 5 rejected as "unchanged". |
| The 10 good edits, then moved on purpose past the tolerance (10 kinds of move) | 100 | 100 rejected. False accepts: 0 of 100. |

Moves past the tolerance: a shift of 0.4% of the long side or more (6 px at 1536), a zoom of 1% or more, a 2% squeeze, a rotation of half a degree or more. Smaller moves are a gray zone: a 2 px shift passed 9 of 10 times, a 4 px shift 0 of 10, a 0.5% zoom 7 of 10, a quarter-degree turn 8 of 10.

What these numbers do not show:

- Thirteen real results is a small sample, from stairs photos only. No real driveway, patio, walkway or wall result has been through the gate.
- The gate checks that the surroundings stayed in place. It does not check that the right surface was replaced, that the finish is plain gray, or that a single object was added or removed.
- If the model redraws most of the surroundings in place, the gate can still pass it as long as about a third of the detailed blocks match.

## Try it without spending anything

```
npm run dev:driveway-mock
```

Open `http://localhost:5173/driveway-generator`. The mock makes no outside calls. The last four digits of the phone number pick the outcome: `0101` moved twice, `0102` daily cap, `0103` model error, `0104` one retry, `0105` phone limit, anything else a picture. `node scripts/driveway-mock-e2e.mjs http://localhost:5173 <folder>` walks every screen at phone width and saves screenshots.

## One real picture through the site's own code

`npx vite-node scripts/driveway-live-check.ts <photo.jpg> "Front steps"` makes one paid call (about 3 cents) and prints the gate's verdict. It does not touch Supabase or the website.

## Prompts

One per job type in `netlify/lib/driveway-openai.ts`, all plain gray concrete. Driveway and Front steps are the wording from the live run of 2026-11-24. Patio, Walkway and Retaining wall follow the same pattern and have not been run against the model.
