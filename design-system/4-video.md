# Video

Portal videos are vertical sequences of real job photos, 10 to 15 seconds long, with short captions and an end card. Most people watch with the sound off, so every word is on screen. The VideoCaption and VideoEndCard components show the frames, and the Examples group has a finished video.

## Frame

- 1080 x 1920 at 30 frames per second.
- Export an MP4: H.264 at CRF 18 in yuv420p, a silent AAC stereo track at 44.1 kHz and 96 kbps, and fast start turned on.
- Convert to limited (TV) range with the BT.709 matrix and tag the file that way (`scale=out_range=tv:out_color_matrix=bt709`, then `-color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709`). Frames rendered from PNG otherwise come out flagged full range (yuvj420p), and some players then show them washed out or harsh.
- Keep all text and the logo inside the safe zone: x 70 to 930 and y 270 to 1248 (`video-safe-left`, `video-safe-right`, `video-safe-top`, `video-safe-bottom`).
- Meta's Reels ad guide reserves the top 269px, the bottom 672px and 65px on each side. Portal rounds the top to 270px and the left to 70px, and keeps 150px on the right as its own choice, to stay clear of the like and share buttons on Reels and Shorts.

## Scenes

- Use 3 to 6 photo scenes of 1.7 to 3.4 seconds each, then the end card. Review videos follow their own timing (see Review video).
- Keep the whole video between 10 and 15 seconds. Scenes overlap by 0.4 seconds at each transition, so the length is the sum of all scene lengths, end card included, minus 0.4 seconds for each transition.
- Example, the before/after steps video: scenes of 2.4, 1.9, 1.7, 1.9, 1.7 and 2.2 seconds plus a 3.4-second end card make 15.2 seconds, minus 6 transitions of 0.4 seconds, for 12.8 seconds.
- Zoom each photo slowly by 8% (10% in review videos). Zoom out instead on the last photo before the end card.
- For before/after, show the BEFORE scene, then wipe left to the AFTER photo from the same angle over `duration-transition`.
- Set captions in `video-caption`, white, in a `portal-scrim` box with `radius-caption`, at the top left of the safe zone. Keep each caption to two lines.
- Never leave one word alone on the last line of a caption, end card headline or proof line. When text runs to two lines, give the lines a similar number of words, and set the break by hand. Example: "Front steps rebuilt / in concrete" and never "Front steps rebuilt in / concrete".
- Fade each caption in over `duration-caption-fade`, starting 0.25 seconds into the scene.
- Use one caption per scene at most. Some scenes can run with only a tag.
- Set tags in `video-tag`: BEFORE on `portal-scrim`, AFTER on `accent-fill`, corners `radius-tag-video`.

## End card

- Give it 3.4 seconds on `portal-charcoal`. The first 0.4 seconds overlap the transition in, so it is fully on screen for 3.0 seconds.
- Stack, 38px apart: the white logo at 460px wide, the headline in `video-endcard-head`, five `portal-star` stars (64px, `space-1` apart) 16px above the Google rating line, one or two proof lines in `video-endcard-line` (`portal-light`), the CtaBadge in `video-cta`, and the URL in `video-url` (`portal-warm`).
- Center the stack between y 270 and y 1248. Center it left to right on the frame with 150px clear on both sides, so it looks centered and still stays off the right-side buttons.
- Fill the bottom 630px (y 1290 to 1920, inside Meta's reserved bottom area) with one finished-job photo, cropped to cover, under a 200px fade from `portal-charcoal` at its top edge. No text or logo goes there. Without it the card ends in an empty charcoal block. Pick a finished job that fits the video, never a team or office photo.

## Review video

A review video shows real Google quotes, word for word, one per scene, 3 to 6 seconds each, then an end card.

- Open on the shortest, strongest quote. Short quotes set big hook people faster than long ones.
- Set the text on `portal-charcoal` starting at y 200, at x 70 to 930 (x 70 to 1020 for a quote broken by hand). This sits 70px above Meta's top line on purpose, to avoid empty space above short quotes; the top 200px still stays clear.
- Stack, 30px apart: five `portal-star` stars at 66px, the quote upright (not italic) in 800 weight at line height 1.1, then the attribution at 42px, 600 weight, `portal-light`: the reviewer's name and "Google review".
- Start the quote at 110px under 45 characters, 100px under 80, 92px under 105 and 86px at 105 or more. Step it down 2px at a time only until no text sits below y 1180, never below 60px.
- End the charcoal panel 80px below the last line of text. A finished-job photo fills the frame from there to the bottom, so the split moves with each quote and no scene has an empty block.
- Match the photo to what the quote talks about (a driveway quote over a driveway). Zoom it slowly by 10%, alternating in and out between scenes. The text stays still.
- The end card uses the same split: logo, headline, stars and rating line, CtaBadge and URL centered from y 200, then the job photo 90px below the URL.
- Cross-fade scenes over 0.4 seconds.

## Sound

- Every video must make sense on mute.
- Music, if any, must be licensed for paid ads.

## Never

- Spinning or bouncing text, word-by-word kinetic captions, glitch or light-leak transitions, stickers or emoji.
- Captions over the lower third of the frame.
