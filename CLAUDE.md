# Pofta Mersi — website

## What this is
Website for **Pofta Mersi**, an artist's brand (artwork, stickers, apparel, small handmade objects).
- **Landing page**: the highest-impact page, an interactive 3D hero. Current focus.
- **Later**: gallery-style pages where the artist shows his work and the items for sale.

The visual direction is NOT final yet (no fixed palette or fonts). Keep all colors, fonts and
material settings in one config file so they can be swapped easily.

## About me (the developer)
I understand code (C/embedded background) but I'm new to web and 3D. Explain web/3D-specific
concepts briefly when you introduce them. Work in small, testable steps. Ask before adding
dependencies that aren't listed below.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
  (pin versions that are compatible with each other and with the installed React version)
- No Spline. All 3D is done in code.

## Devices
**Mobile-first.** Most visitors use phones; tablets and desktop must also work well.
- Test layouts at 375px, 768px, 1280px+ widths
- Touch and mouse must both work (pointer events)
- Must stay smooth on a mid-range phone

## Landing hero — spec
Interactive 3D letters spelling **POFTA MERSI** in a full-screen canvas.

**Letters**
- One rigid body per letter (11 letters, space is not a body)
- Phase 1: `Text3D` from drei with a thick, chunky font (typeface JSON in `/public/fonts`),
  with bevel enabled, since bevels catch light and make glass read well
- Phase 2 (later): replace with the brand's own lettering, extruded from SVG
  (`SVGLoader` + `ExtrudeGeometry`)

**Physics / interaction**
- Letters drop in on load and settle; they can be grabbed and dragged (mouse + touch),
  thrown, and collide with each other
- Invisible walls/floor computed from the current viewport so letters never leave the screen;
  recompute on resize/orientation change
- Use convex hull colliders for the letters
- On phones: optional tilt (DeviceOrientation) changes gravity direction; iOS requires a
  permission request triggered by a button tap, never automatic
- Dragging inside the canvas must not make the page unusable: keep a clear way to scroll
  or navigate onward (button/arrow below the hero)

**Look: soft, puffy, pastel-iridescent (reference: "Interactive 3D Shapes", Webflow x Spline)**
- Letters look inflated/squishy: large rounded bevel (high `bevelSize`, `bevelThickness`,
  `bevelSegments`), like balloons or gummies, not sharp extruded text
- Material: `MeshPhysicalMaterial` with `iridescence`, `sheen`, light `clearcoat`,
  medium roughness (satin, not glossy, not glass). No transmission/refraction.
- Each letter has a soft color gradient (pink, peach, lavender, baby blue), via vertex colors
  or a small gradient shader; each letter slightly different
- Scene: light lavender background, letters resting on an invisible floor, camera slightly
  above looking down at an angle, soft `ContactShadows` under the letters, soft
  studio `Environment` lighting
- Optional, desktop only: subtle depth-of-field blur. Never on mobile.
- Optional experiment later: glass variant (`MeshTransmissionMaterial`) as a theme toggle

**Performance & robustness**
- Canvas loaded client-side only (dynamic import, `ssr: false`), with a static
  placeholder while loading
- `dpr={[1, 2]}`, minimal shadows, pause rendering when the tab/hero is not visible
- Respect `prefers-reduced-motion`: show a static arrangement, no physics
- If WebGL is unavailable, show a static image fallback

## Structure (suggested)
```
app/
  page.tsx              # landing
  lab/page.tsx          # sandbox for experiments, not linked in nav
components/hero/
  HeroCanvas.tsx        # Canvas, camera, lights, environment
  Letters.tsx           # letter bodies + drag logic
  Bounds.tsx            # viewport-based walls
  GlassBackground.tsx   # what the glass refracts
config/theme.ts         # colors, fonts, material params (single source of truth)
public/fonts/
```

## Working rules
- Build experiments in `/lab` first, move to the landing page only when approved
- After each step: tell me how to test it (incl. on my phone via Vercel preview)
- Keep components small and readable; comment non-obvious 3D/physics code
