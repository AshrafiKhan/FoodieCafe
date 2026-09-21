# FoodieCafe

A single-page site for a fictional multi-cuisine food court. Static HTML, CSS and
vanilla JavaScript, with GSAP driving the animation. No build step, no `npm install`.

## Run it

Any static server works. From this folder:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`. Opening `index.html` straight from the file
system also works, except the Google Maps embed, which needs `http://`.

## Deploy it

Upload the whole folder. It is plain static files, so Netlify, Vercel, GitHub Pages,
Cloudflare Pages or ordinary cPanel hosting all serve it as-is with no configuration.

## Layout

```
index.html          all markup
css/styles.css      design tokens, layout, components
js/main.js          animation, menu filter, countdown, lightbox, form validation
assets/img/         89 photos (24 dishes x 3, plus hero, offers and gallery)
```

## Sections

1. **Hero** - split-letter headline reveal, parallax photo collage, scroll cue
2. **Offers** - live happy-hour countdown and three combo cards, under a marquee ticker
3. **Why us** - four feature cards and four stat counters that count up on scroll
4. **Menu** - 24 dishes split into Pure Veg (17) then Non-Veg (7), across 6 cuisines,
   filtered with a GSAP Flip transition. A group hides itself when the active cuisine
   empties it, since Italian, desserts and drinks are veg-only. Clicking a card opens
   a detail modal with three photos of that dish, a longer description, calories,
   cook time, portion, spice level, ingredients and allergens.
5. **Gallery** - nine-photo grid with hover captions and a keyboard-navigable lightbox
6. **Visit** - opening hours with today highlighted, contact details, map, booking form
7. **Footer** - sitemap, socials, newsletter signup

## Animation

GSAP 3.15.0 (core, ScrollTrigger, Flip) and Lenis 1.3.26, all from CDN. On top of the
scroll reveals there is a preloader, a magnetic hover on the buttons, a blend-mode
cursor, 3D tilt on the cards, a scroll-velocity-linked marquee, and a scroll progress bar.

Three things degrade on purpose:

- **CDN fails or JS is off.** The start-states live behind a `.js-anim` class on `<html>`
  that only gets added when the animation layer is alive, plus a 3.5s timeout in
  `index.html` that removes it. The full page renders, static. Verified by loading a
  copy with the CDN tags stripped.
- **`prefers-reduced-motion: reduce`.** Lenis, GSAP and the preloader are all skipped
  and the CSS collapses every transition and keyframe.
- **Opened in a background tab.** Browsers freeze `requestAnimationFrame` there, so the
  preloader is skipped outright rather than hanging until you switch tabs.

`window.FoodieCafe` exposes the Lenis instance for debugging in the console.

**Gotcha if you add another scrollable overlay:** Lenis calls `preventDefault()` on
wheel and touch across the whole document, even while stopped, so a nested scrollable
element silently refuses to scroll on touch devices. Put `data-lenis-prevent` on it,
as `.dish-modal__scroll` does.

## What to change before this goes live

Everything below is placeholder content for a business that does not exist.

| What | Where |
|---|---|
| Name, address, phone, email | `index.html` - search `Example Plaza`, `XXXXX XXXXX`, `foodiecafe.example` |
| Map location | `index.html` - swap the `.map--placeholder` block in Visit for your own embed |
| Menu items and prices | `index.html` - the 24 `<article class="dish">` blocks |
| Dish detail copy, calories, allergens | `js/main.js` - the `DISH_INFO` map, keyed by image slug |
| Offers and pricing | `index.html` - the three `<article class="offer">` blocks |
| Happy hour window | `js/main.js` - `HH_START` / `HH_END`, currently 16:00-19:00 |
| Opening hours | `index.html` - the `<ul class="hours">` list |
| Social links | `index.html` - the `.socials` block, currently `href="#"` |
| Brand colours | `css/styles.css` - the `:root` block at the top |
| Photos | `assets/img/` - keep the filenames and the markup needs no edits |

## The forms do not send anything

Both the reservation form and the newsletter signup are front-end only. They validate
input and show a success state, and the reservation logs its payload to the console.
Point them at a real endpoint before launch - the submit handlers are at the bottom of
`js/main.js`.

## Photography

The 89 photos came from [Unsplash](https://unsplash.com), which permits commercial use
without attribution. They are stock images of other restaurants, so replace them with
photos of the actual place before launch. Keeping the existing filenames means no markup
changes are needed.

## Accessibility

One `<h1>` and five `<h2>`s, real `alt` text on every photo, a skip link, visible focus
rings, a focus trap in the mobile drawer, `Escape` to close the drawer and lightbox,
arrow keys across the menu tabs and the lightbox, and `aria-live` on the countdown and
form results. Colours are the bright brand palette - if you change them, re-check
contrast on the yellow.
