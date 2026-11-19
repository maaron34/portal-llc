Website buttons and text links: a green primary, an outlined secondary, a small header version and an arrow link.

## Use it for
- Primary: the one action on a screen, almost always "Get a free estimate" ("Free estimate" in the small header version). One per section.
- Secondary: the alternative beside it, such as "View our work".
- Small: the header button.
- Text link with arrow: "View all services" and other links that close a section.

## The consumer provides
- The label in sentence case, and the destination.
- An arrow icon only on the hero's primary button and on text links that close a section.

## Rules
- Primary uses `accent-fill` with `on-accent` text and `radius-md`; hover is `accent-fill-pressed`.
- Text links are `accent-ink` and underline on hover. They never darken, because the darker green fails on dark grounds.
- Secondary uses `control-outline` for its border. That border is light, so the label must say what the button does.
- Focus shows a 2px `accent-ink` ring, 2px out.
- Never use buttons in static ads or video. Use the CtaBadge there.
