# Testimonial Section Design QA

**Source visual truth:** `/Users/sylvesternkeze/Desktop/Screenshot 2026-09-12 at 04.30.42.png` (project copy: `img/qa-testimonial-reference.png`)  
**Implementation:** `/Users/sylvesternkeze/Documents/Projects/9sevegroup/index.html`, rendered at `http://127.0.0.1:4173/#testimonials`  
**Comparison artifact:** `/Users/sylvesternkeze/Documents/Projects/9sevegroup/qa-testimonial-comparison.html`  
**State:** two-row automatic marquee; hover, keyboard focus, reduced-motion, desktop, and mobile states tested

## Capture normalization

- Source bitmap: 1852 × 1194 px. No density metadata was supplied, so the delivered pixels were treated as the visual reference canvas.
- Desktop implementation capture: 1440 × 964 CSS px at device scale factor 1.
- Mobile implementation capture: 390 × 844 CSS px at device scale factor 1.
- The side-by-side comparison artifact places the supplied source and the live local implementation on one canvas for direct review. The implementation intentionally retains the site's navigation and red brand accent.

## Full-view comparison evidence

The supplied design and implementation share the same dominant composition: an oversized centered heading followed by two horizontally moving rows of large, softly rounded neutral cards. Partial cards at the viewport edges signal continuous motion. Each card uses an oversized quote mark, a concise testimonial, and a compact circular portrait/name/role footer.

The implementation translates the reference into the existing 9Seven design system: warm paper and pale steel surfaces replace pure white, red replaces the reference blue accent, Inter remains the primary typeface, and the section is inserted directly below Services without changing the site's existing content flow.

## Focused region comparison evidence

Focused inspection covered card radius, card height consistency, row gap, quote hierarchy, text wrapping, portrait crops, identity spacing, clipped edge cards, and motion continuity. At 1440 px, all cards measured 301 px high. At 390 px, cards measured 328 × 296 px and the document had no horizontal overflow.

## Required fidelity surfaces

- **Typography:** Bold centered heading, legible neutral sans-serif body copy, and compact identity metadata follow the reference hierarchy while matching the site's existing Inter-based system.
- **Spacing and layout:** Two evenly spaced marquee rows use equal-height cards, large interior padding, partial edge reveals, and responsive widths.
- **Colors and tokens:** The existing charcoal, warm paper, steel-gray, and `#c41e2e` red palette is preserved. No new gradient treatment was introduced.
- **Image quality:** Eight coordinated 512 × 512 photorealistic African profile portraits were generated, optimized to 52–64 KB JPEGs, and verified for clean circular cropping with no text, logos, or watermarks.
- **Content integrity:** All names, roles, and quotes are explicitly identified on the page as illustrative. The profiles are not represented as verified customers.
- **Motion:** Each four-card group is duplicated once for a seamless infinite loop. The two rows move in opposing directions, pause on hover or keyboard focus, and resume when interaction ends.
- **Accessibility:** The marquee rows are keyboard-focusable and describe the pause behavior. Decorative quote icons are hidden from assistive technology. Portrait alt text identifies every image as AI-generated and every person as a fictional profile. Reduced-motion preference disables animation and enables manual horizontal scrolling.

## Findings and fixes

1. **Initial pass — P2:** three offscreen portrait images were still lazy-loading during the desktop motion test and briefly appeared unresolved. **Fix:** testimonial portraits now load eagerly. **Post-fix evidence:** 16 of 16 rendered portrait instances loaded successfully after the duplicated groups were created.
2. **Final pass:** eight unique testimonial cards, sixteen rendered instances, two rows, infinite animation, hover pause/resume, focus pause, reduced-motion fallback, desktop layout, and mobile layout all passed. Browser console checks returned no warnings or errors.

No actionable P0, P1, or P2 differences remain within the requested testimonial scope.

## Interaction and responsive checks

- Desktop document width matched the 1440 px viewport with no horizontal overflow.
- Mobile document width matched the 390 px viewport with no horizontal overflow.
- Animation position changed during an idle timing sample, remained fixed while hovered, and resumed after hover ended.
- Both duplicated card groups are marked `aria-hidden="true"` to avoid repeated screen-reader content.
- The section sits immediately below `#services` and does not disturb existing anchors, navigation, or quote form behavior.

## Follow-up polish

Replace the illustrative copy and generated profiles with approved customer quotes and photography before public release.

## Authentic Work Gallery and Header QA

- **Placement and content:** `#gallery` appears directly after `#experience` and before `#contact`. All nine unused on-site JPEGs are present as labelled, keyboard-operable tiles with factual image alt text and captions.
- **Desktop review:** The 12-column gallery mosaic presents one tall feature image, four supporting images, and a final four-image row. The sticky navigation uses the requested `0.8` dark glass treatment, has content-sized centered bounds, and uses one equal flex gap on either side of the nav-link group. It includes Gallery, and its Request a Quote CTA targets `#quote-form`.
- **Mobile review:** At 390 × 844 px, the gallery becomes a single-column portrait stream with 0 px horizontal overflow. The header correctly collapses to the existing mobile menu.
- **Lightbox checks:** Opening a tile displays the full uncropped image, caption, and count. Previous/next controls, Arrow Right, previous-from-first wraparound to 9 of 9, close control, Escape, focus restoration, scroll locking, and modal semantics were verified. Horizontal touch-swipe handling is implemented with a 50 px activation threshold.
- **Accessibility and quality:** The modal uses `role="dialog"` and `aria-modal`; background regions become inert while open. All thumbnail images are lazy loaded with intrinsic dimensions. Browser console check returned no warnings or errors.

No actionable P0, P1, or P2 differences remain within the gallery and header scope.

## Reference-Inspired Hero Redesign QA

**Source visual truth:** `/Users/sylvesternkeze/Downloads/cap.webp` (project copy: `img/qa-hero-reference.webp`)
**Implementation:** `index.html` at `http://localhost:4173/#home`
**Comparison artifact:** `qa-hero-comparison.html`, which presents the source and live implementation side by side
**State:** default desktop hero, plus responsive checks at 768 × 1000 and 390 × 844 CSS px

### Capture normalization

- Reference: 1504 × 1128 px.
- Desktop implementation: 1504 × 1128 CSS px at device scale factor 1.
- Tablet implementation: 768 × 1000 CSS px at device scale factor 1.
- Mobile implementation: 390 × 844 CSS px at device scale factor 1.
- The comparison artifact normalizes both desktop views to their complete top-fold canvases for direct visual review.

### Full-view comparison evidence

The implemented hero retains the visual structure of the supplied reference: a centered oversized heading, a seven-tile asymmetric photo collage, rounded image cards, a dark central CTA, a supporting service link, and a quiet lower information row. Its content, generated construction photography, charcoal navigation, warm-paper background, red accent, lead copy, and credential strip all stay aligned with the existing 9Seven site.

### Required fidelity surfaces

- **Typography:** The existing Inter/Oswald system is retained. The display heading is centered, high contrast, and constrained to a stable two-line desktop treatment that reduces cleanly on mobile.
- **Spacing and layout:** The five-column desktop collage mirrors the reference’s tall inner columns, smaller outer tiles, central image/CTA stack, generous white space, and rounded 20 px image treatment. The mobile layout becomes a two-column mosaic with the main image and CTA spanning both columns.
- **Colors and tokens:** The established warm paper, charcoal, and 9Seven red are preserved; no gradients or unrelated visual language were added.
- **Image quality:** Seven coordinated, photorealistic South African service images were generated and saved as quality-82 JPEGs because the local imaging runtime cannot encode WebP. All have intrinsic dimensions, descriptive alt text, and verified successful browser loads; the primary maintenance image has high fetch priority.
- **Copy and affordances:** Existing hero messaging is retained and rearranged. The primary CTA targets `#contact`, the service link targets `#services`, and the lower callout targets `#experience`.
- **Accessibility and behavior:** Every hero image has meaningful alt text, links use visible focus styles, reduced-motion preferences continue to disable transitions, and the unchanged mobile menu, credentials, navigation, and quote form remain available.

### Findings and fixes

1. **P2 — tablet callout crowding:** The numeric `01` treatment overlapped the lower-right hero message at the 768 px breakpoint. **Fix:** removed the number and simplified the callout grid to a text-and-arrow layout. **Post-fix evidence:** the callout now fits on one clear column with no overlap at 768 px.
2. **Requested testimonial refinements:** Removed the illustrative-testimonial disclaimer and its obsolete ARIA reference. Updated the testimonial supporting line to start with “Illustrative” rather than “Eight illustrative.”
3. **Final pass:** Seven hero images loaded successfully, the three hero links expose the intended targets, a fresh-browser console check returned no warnings or errors, and desktop, tablet, and mobile views showed no actionable P0, P1, or P2 issues.

### Contact Gradient Follow-up

The parent contact section now transitions from the existing warm-paper background at the bottom to white at the top. Its charcoal contact panel remains unchanged, preserving the established form and information contrast. Browser-rendered review confirmed the gradient, contact panel, and footer remain legible.

final result: passed
