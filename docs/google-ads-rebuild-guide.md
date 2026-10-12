# Google Ads rebuild: replace the Smart campaign with a Search campaign

Written 2026-10-11 for Michael to execute in Chris's Google Ads account (customer 671-074-5013). Ticket: https://github.com/maaron34/portal-llc/issues/63

Every instruction below was checked against Google's help pages on 2026-10-11; the page is linked at the start of each part. Google moves menus around, so if a screen does not match, open the linked page before guessing. Do each part in order. At the end of each part, send Claude the screenshot the part asks for, before the next part.

## What exists today (measured 2026-10-11)

- One Smart campaign, "West Seattle Concrete" (id 19219142140), $13 a day, running since December 2022. Last 90 days: 895 clicks, $1,156, 9 "conversions" as Google counts them, 4 real leads as the CRM counts them.
- A Local Services campaign (id 23698542710) that has never spent anything. Leave it alone.
- Auto-tagging is on. No tracking template is set, so PostHog cannot tell ad groups or keywords apart.
- Conversion actions that exist: form fills from the website ("www.buildwithportal.com (web) generate_lead", imported from Google Analytics) and real calls ("Calls from ads"). Both are correct. Also counted as conversions today: "Smart campaign ad clicks to call" and "Calls from Smart Campaign Ads". Five "Local actions" (directions, menu views, website visits) exist but are not counted.
- Six sitelinks still point at the old Wix site (www.buildwithportal.com/book-online, /service-page/...). Those pages are gone.
- The website already carries the Google tag (G-TXQQ1VLCVN) and sends a `generate_lead` event on every form submit, so no code change is needed for form tracking.
- Landing pages that exist: https://buildwithportal.com/lp/driveways, https://buildwithportal.com/lp/patios, https://buildwithportal.com/lp/stairs, https://buildwithportal.com/lp/estimate, plus service pages such as https://buildwithportal.com/services/reconditioning/ and https://buildwithportal.com/services/retaining-walls/.

## What people search for (Search Console, last 180 days)

| Search | Times Portal appeared | Clicks |
|---|---|---|
| concrete repair seattle | 2,586 | 2 |
| concrete contractors seattle | 2,377 | 15 |
| concrete contractor | 1,934 | 1 |
| concrete contractor seattle | 1,831 | 7 |
| seattle concrete contractors | 1,423 | 5 |
| concrete driveway seattle | 1,245 | 1 |
| concrete companies near me | 1,228 | 1 |
| seattle concrete patio | 929 | 2 |
| concrete companies seattle | 819 | 4 |
| seattle concrete repair | 705 | 4 |

Repair and driveways get the most searches and almost no clicks today, so they are the first two ad groups.

---

## Part 1: Clean up conversions (15 minutes)

Google page: https://support.google.com/google-ads/answer/16560108

Why first: the new campaign will bid toward whatever is marked as a conversion. Today that includes button taps that are not leads. After this part, only a form fill or a real call counts.

1. Open https://ads.google.com/aw/conversions
2. Find "www.buildwithportal.com (web) generate_lead". Confirm the Status column says Active and the Action optimization column says Primary. Leave it.
3. Find "Calls from ads". Confirm Primary. Leave it.
4. Find "Smart campaign ad clicks to call". Click its name, then Edit settings. Set Action optimization to Secondary. Save.
5. Repeat step 4 for "Calls from Smart Campaign Ads" and "Clicks to call".
6. Leave the five "Local actions" rows and the "purchase" row as they are. They do not count today.
7. Send Claude a screenshot of the conversions table.

## Part 2: Create the Search campaign (30 minutes)

Google page: https://support.google.com/google-ads/answer/9510373

1. Open https://ads.google.com/aw/campaigns/new
2. Choose the objective Leads.
3. Under "Select a campaign type" select Search.
4. Under "Use these conversion goals", keep only Submit lead form and Phone call leads checked. Remove any other goal. Click Continue.
5. Name the campaign `Search - Seattle concrete`.
6. Bidding: choose Clicks. Turn on "Set a maximum cost per click bid limit" and enter 3.00. (The Smart campaign pays about $1.29 a click; the cap stops a runaway keyword.) After about 30 conversions, Claude will tell you when to switch to Conversions.
7. Networks: uncheck Include Google search partners. Uncheck Include Google Display Network. Both boxes must be empty.
8. Locations: click Enter another location, then Advanced search, then Radius. Enter `West Seattle, WA` and 25 miles. Save. Under Location options choose Presence: People in or regularly in your targeted locations. Not "interest".
9. Languages: English.
10. Audience segments: skip.
11. Ad assets: skip for now. Part 4 adds them.
12. Budget: 13.00 a day.
13. Start date: today. No end date.
14. Click Save and continue. The next screen is ad groups, which is Part 3.

Do not click Publish before Part 3 and Part 4 are done. If you need to stop, the campaign saves as a draft and shows at the top of https://ads.google.com/aw/campaigns with a Resume and continue button.

## Part 3: Ad groups, keywords and ads (60 minutes)

Google page: same as Part 2, sections 3 and 4.

Six ad groups, one per service, one landing page each. Keyword match types: quotation marks mean phrase match (the search must contain that phrase); brackets mean exact match. No bare keywords: a bare keyword is broad match and shows for anything Google thinks is related.

For each ad group: enter the keywords (one per line, with the quotation marks or brackets as written), then create one responsive search ad with the final URL, the headlines and the descriptions listed. Every headline is 30 characters or fewer; every description is 90 or fewer.

### Ad group 1: Concrete repair

Final URL: `https://buildwithportal.com/services/reconditioning/`

Keywords:
```
"concrete repair seattle"
"seattle concrete repair"
"concrete repair near me"
"concrete driveway repair"
"concrete crack repair"
"concrete repair contractor"
[concrete repair seattle]
```

Headlines (pick all; Google rotates them):
```
Concrete Repair in Seattle
Cracked or Sinking Concrete?
Local, Licensed, Insured
Free On-Site Estimate
West Seattle Concrete Crew
Driveway and Walkway Repair
Repair or Replace, Your Call
Text Chris a Photo for a Quote
```

Descriptions:
```
We repair, level and replace cracked concrete across Seattle. Text us a photo and get a fast answer.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Ad group 2: Driveways

Final URL: `https://buildwithportal.com/lp/driveways`

Keywords:
```
"concrete driveway seattle"
"concrete driveway contractor"
"concrete driveway contractors near me"
"new concrete driveway"
"driveway replacement seattle"
"concrete driveway cost"
[concrete driveway seattle]
```

Headlines:
```
Concrete Driveways in Seattle
New or Replacement Driveways
Free On-Site Estimate
Local, Licensed, Insured
Driveway Removal and Pour
Curb Cuts and ADU Pads
West Seattle Concrete Crew
Text Chris a Photo for a Quote
```

Descriptions:
```
We remove the old slab, prep the base and pour a driveway that lasts. Seattle homeowners, free estimates.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Ad group 3: Patios

Final URL: `https://buildwithportal.com/lp/patios`

Keywords:
```
"concrete patio seattle"
"seattle concrete patio"
"concrete patio contractors near me"
"concrete patio installation"
"backyard concrete patio"
"stamped concrete patio seattle"
[concrete patio seattle]
```

Headlines:
```
Concrete Patios in Seattle
Backyard Patios That Last
Broom, Stamped or Exposed
Free On-Site Estimate
Local, Licensed, Insured
West Seattle Concrete Crew
Patios Around Pools and Decks
Text Chris a Photo for a Quote
```

Descriptions:
```
A concrete patio built for Seattle rain: proper drainage, clean finish, done on schedule. Free estimates.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Ad group 4: Steps and walkways

Final URL: `https://buildwithportal.com/lp/stairs`

Keywords:
```
"concrete steps seattle"
"concrete stairs seattle"
"concrete front steps"
"concrete walkway seattle"
"concrete steps repair"
"concrete sidewalk contractor seattle"
```

Headlines:
```
Concrete Steps and Walkways
Front Steps Rebuilt Right
Free On-Site Estimate
Local, Licensed, Insured
Sidewalks, Paths and Stairs
West Seattle Concrete Crew
Text Chris a Photo for a Quote
```

Descriptions:
```
Front steps, walkways and sidewalks poured to code, with the railings and drainage done right.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Ad group 5: Retaining walls

Final URL: `https://buildwithportal.com/services/retaining-walls/`

Keywords:
```
"concrete retaining wall seattle"
"retaining wall contractor seattle"
"retaining wall replacement"
"concrete retaining wall contractor"
"retaining wall repair seattle"
```

Headlines:
```
Concrete Retaining Walls
Seattle Retaining Wall Crew
Replace a Failing Wall
Free On-Site Estimate
Local, Licensed, Insured
Engineered for Seattle Slopes
Text Chris a Photo for a Quote
```

Descriptions:
```
Poured concrete retaining walls for Seattle hillsides, with drainage and footings built to last.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Ad group 6: Concrete contractor (general)

Final URL: `https://buildwithportal.com/lp/estimate`

Keywords:
```
"concrete contractors seattle"
"concrete contractor seattle"
"seattle concrete contractors"
"concrete companies seattle"
"concrete companies near me"
"concrete contractors near me"
"concrete work seattle"
[concrete contractors seattle]
[concrete contractor seattle]
```

Headlines:
```
Seattle Concrete Contractor
Driveways, Patios, Walls
Free On-Site Estimate
Local, Licensed, Insured
West Seattle Concrete Crew
Small Jobs Welcome
Text Chris a Photo for a Quote
Concrete Done Once, Done Right
```

Descriptions:
```
Driveways, patios, steps, walls and repair across Seattle. Text a photo, get a fast answer, free estimate.
Portal is a West Seattle crew that shows up, answers the phone and does the job once. Licensed and insured.
```

### Negative keywords (campaign level, all ad groups)

After the ad groups are saved, open the campaign, then Keywords, then Negative keywords, then the plus button, and paste this list (one per line). These stop the ads showing to people who are not hiring a contractor.
```
jobs
job
hiring
salary
career
diy
how to
youtube
free
calculator
ready mix
ready-mix
mixer
truck
delivery
supply
supplies
bags
home depot
lowes
rental
rent
class
course
training
sealer
stain
paint
countertop
countertops
blocks
pavers
asphalt
```

Send Claude a screenshot of the ad group list and one of the Concrete repair ad.

## Part 4: Assets (20 minutes)

Google page: https://support.google.com/google-ads/answer/9510373 (section "Enhance ads with assets")

1. In the campaign, open Assets.
2. Remove every sitelink that points at www.buildwithportal.com/book-online or /service-page/. Those pages no longer exist.
3. Add sitelinks (link text, final URL):
   - `Driveways` → https://buildwithportal.com/lp/driveways
   - `Patios` → https://buildwithportal.com/lp/patios
   - `Concrete Repair` → https://buildwithportal.com/services/reconditioning/
   - `Free Estimate` → https://buildwithportal.com/lp/estimate
4. Add callouts: `Licensed and Insured`, `Free Estimates`, `West Seattle Based`, `Small Jobs Welcome`.
5. Add a call asset with the Portal line, (206) 829-6396. Turn on call reporting if asked. This is the number "Calls from ads" measures.
6. Add image assets: 4 to 6 job photos from https://buildwithportal.com/projects/ (Portal's own photos only; never stock).
7. Send Claude a screenshot of the assets list.

## Part 5: Tracking template, so PostHog can tell ad groups apart (10 minutes)

Google pages: https://support.google.com/google-ads/answer/10070427 and https://support.google.com/google-ads/answer/6076199

Google says a template at the account level "applies to all of the ads" and changes "take 24–48 hours to be reflected". Setting it at the account level means the ads do not go back through review.

1. Open Admin, then Account settings, then Tracking.
2. In Tracking template, paste exactly:
```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}
```
3. Click Test. Google must report that the test succeeded.
4. Save.
5. Tell Claude it is saved. Claude then updates the PostHog channel mapping so each ad group shows its own cost per lead.

## Part 6: Publish and the first week

1. Review the campaign summary. Fix anything Google flags with Fix it.
2. Click Publish.
3. Leave the Smart campaign running for 7 days alongside. Both spend $13 a day during the overlap; that is the price of a clean handover.
4. On day 2, open the campaign, then Insights and reports, then Search terms. Any search that is not someone hiring a concrete contractor goes into the negative list (select it, Add as negative keyword).
5. On day 7, send Claude the Search terms screenshot and the Ad groups screenshot. Claude compares cost per lead against the Smart campaign's $187 and recommends what to pause or raise.

## Part 7: Pause the Smart campaign (5 minutes, on day 7)

Google page: https://support.google.com/google-ads/answer/7458026

1. Open https://ads.google.com/aw/campaigns and click "West Seattle Concrete".
2. Under the campaign name, click its status, then Pause campaign.
3. Choose Forever, or until I resume. Click Pause.
4. Tell Claude. The Smart-campaign conversion actions from Part 1 then stop counting on their own.

## Decisions made in this guide, so they are not re-litigated

- Clicks with a $3 cap, not Conversions, to start: Google's conversion bidding needs about 30 conversions to learn, and this account has 4 real leads a quarter.
- 25-mile radius around West Seattle, presence only: this is Chris's service area as set in the CRM (over 25 miles is declined).
- Phrase and exact match only: broad match on a $13 budget spends the day on "concrete calculator".
- Repair and driveways first: the two biggest searches with the fewest clicks today.
- Headlines say "Text Chris a Photo for a Quote" because that is how Chris wants leads to arrive; the landing pages carry the Text button.
