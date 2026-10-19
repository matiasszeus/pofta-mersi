// Single source of truth for the look and feel of the hero.
// Units: 1 = one world unit in the 3D scene (not pixels). Angles are in radians
// unless noted. Tuples are [x, y, z] with y pointing up and z towards the viewer.

type Vec3 = [number, number, number];

// Each font needs two files with the same glyphs: a typeface JSON for the 3D
// letters (Text3D) and an .otf/.ttf for the flat outlines (<Text>).
const fonts = {
  // Only A–Z (no digits, punctuation or diacritics). The typeface JSON is a
  // straight conversion of the .ttf; the glyphs are not modified.
  craze: {
    name: "Craze Retro",
    typeface: "/fonts/craze-retro/craze-retro.typeface.json",
    file: "/fonts/craze-retro/Craze%20Retro.ttf", // %20 = the space in the file name
  },
  bagel: {
    name: "Bagel Fat One",
    typeface: "/fonts/bagel-fat-one.typeface.json",
    file: "/fonts/bagel-fat-one.otf",
  },
  fredoka: {
    name: "Fredoka Bold",
    typeface: "/fonts/fredoka-bold.typeface.json",
    file: "/fonts/fredoka-bold.otf",
  },
};

// The brand palette. Every color below comes from here.
export const palette = {
  sage: "#BFDDBA", // landing background
  lilac: "#C58BEA", // main accent (the glow of the flowers)
  green: "#2F8A5C", // atelier background (the cutting mat)
  ink: "#1D2633", // near-black: text and letters on light backgrounds
  neon: "#4CF23C", // only small accents on dark backgrounds, never text on light
  white: "#FFFFFF", // text on the green (sage on green is too faint to read)
};

// Used in more than one place below.
const landingBackground = palette.sage;
const atelierBackground = palette.green;

export const theme = {
  fonts,
  // Which of the fonts above to use: "craze", "bagel" or "fredoka".
  font: "craze" as keyof typeof fonts,

  colors: {
    background: landingBackground,
    // One color per letter, reused in a loop if there are more letters than colors.
    letters: [palette.ink],
  },

  // The landing's background image behind the 3D scene: flowers rendered once
  // as a still image (see public/images/landing/). Portrait screens get the
  // tall version, everything else the wide one.
  landing: {
    flowersPortrait: "/images/landing/flowers-portrait.webp",
    flowersLandscape: "/images/landing/flowers-landscape.webp",
  },

  camera: {
    // Slightly above the letters, looking a little down. lookAt is also the
    // center of the space the letters move in.
    position: [0, 3, 16] as Vec3,
    lookAt: [0, 0, 0] as Vec3,
    // Vertical field of view in degrees. Portrait screens get a wider one,
    // otherwise the scene would be far too narrow on a phone.
    fovLandscape: 35,
    fovPortrait: 55,
  },

  lights: {
    ambientIntensity: 1.1,
    // Main light, from the front, upper right. Also the one casting the
    // shadow (see `shadow`).
    keyIntensity: 2.2,
    keyPosition: [4, 12, 8] as Vec3,
    fillIntensity: 0.6,
    fillPosition: [-6, 5, -4] as Vec3,
    // Soft light from where the camera is, so the near-black letters
    // show their blue tint instead of reading as plain black.
    frontIntensity: 1.2,
    frontPosition: [0, 4, 14] as Vec3,
    // Rim light: from behind, above and to the left. It only reaches the
    // letters' top and side edges, drawing a lilac line along them.
    rimColor: palette.lilac,
    rimIntensity: 3,
    rimPosition: [-5, 9, -8] as Vec3,
  },

  // A soft shadow of the letters on an invisible wall behind them, so they
  // seem to float above the flowers. Cast by the key light.
  shadow: {
    // How far behind the letters the wall is, in letter sizes (so it looks
    // the same on every screen). Further = the shadow lands further away
    // (down and to the left).
    distance: 0.3,
    color: palette.ink,
    opacity: 0.22, // darkness of the shadow, 0..1
    blur: 10, // softness of the edge
    mapSize: 512, // shadow texture resolution; lower = faster, blurrier
    // Area (around the middle of the scene, in world units) where shadows
    // are computed; extends far down so falling letters keep theirs.
    area: { left: -12, right: 12, top: 12, bottom: -30 },
  },

  letters: {
    // Each string is one row; every character becomes its own rigid body.
    rows: ["POFTA", "MERSI"],
    // The size is whatever makes the outlines fit the screen (see `outline`),
    // but never larger than this.
    maxSize: 3.5,
    // Shape, as fractions of the letter size, so the proportions survive scaling.
    // depth = the flat middle part; the bevel adds a rounded bulge on the front
    // and on the back (bevelThickness each). Sideways the rounding is bevelSize
    // wide: bevelInset of it is cut into the flat face, the rest makes the
    // letter fatter than the font's outline. Bigger bevel = puffier, but a
    // large bevelInset breaks the faces of thin strokes, and a large
    // (bevelSize - bevelInset) closes up small holes (A, P, R).
    depth: 0.18,
    bevelSize: 0.03,
    bevelInset: 0.015,
    bevelThickness: 0.06,
    // Smoothness of the bulge and of the curves in the outline. Fewer =
    // lighter geometry (faster), but curves start to show corners.
    bevelSegments: 3,
    curveSegments: 10,
    // Satin: soft, wide highlights; not glossy, not metallic.
    roughness: 0.55,
    metalness: 0,
    // Which axes a letter may spin around / move along [x, y, z]. Spinning only
    // around z and never moving in z = it behaves like a sticker sliding on the
    // screen: always facing the camera, always at the depth of its outline.
    rotationAxes: [false, false, true] as [boolean, boolean, boolean],
    moveAxes: [true, true, false] as [boolean, boolean, boolean],
  },

  // The flat outlines in the middle of the screen that the letters sit in.
  outline: {
    // palette.ink, or palette.lilac for a colored outline.
    color: palette.ink,
    opacity: 0.3,
    // Line thickness, as a fraction of the letter size.
    width: 0.03,
    // The block of letters may be at most this wide / tall, as a fraction of
    // the screen; whichever limit is reached first decides the letter size.
    // On phones the width always runs out first.
    maxWidthPortrait: 0.92,
    maxHeightPortrait: 0.55,
    maxWidthLandscape: 0.45,
    maxHeightLandscape: 0.3,
    // true = every row is as wide as the widest one: shorter rows (MERSI)
    // get more space between their letters, so the block has straight edges.
    justify: true,
    // Shifts the block up from the exact center (fraction of screen height).
    offsetY: 0.04,
    // Extra gap between letters (in the widest row) and between the two
    // rows, in letter sizes.
    letterSpacing: 0.04,
    rowGap: 0.12,
  },

  // What happens after the tap: letters let go one by one and fall out of the
  // screen while the camera dives after them (see `dive`).
  // stagger, gravity and exitMargin decide when the last letter is out; keep
  // that just before dive.duration.
  fall: {
    stagger: 0.04, // seconds between one letter and the next
    sideSpeed: 1.5, // random push left/right (max)
    spin: 1.6, // random spin (max, radians per second)
    // A letter counts as gone once it is this far below the bottom edge of the
    // screen, in letter sizes.
    exitMargin: 0.8,
    // Safety net: go to the atelier after this many seconds even if a letter
    // somehow never left the screen.
    maxDuration: 4,
  },

  // The camera following the letters down, from the tap to the atelier.
  dive: {
    // Seconds from the tap to the atelier. The atelier opens at this point,
    // or as soon as the last letter is out if that takes longer.
    duration: 1.6,
    // Seconds after the tap before the camera starts moving.
    cameraDelay: 0.08,
    // How far the camera has moved down at `duration`, in screen heights.
    distance: 0.5,
    // Camera easing: 1 = constant speed; higher = slower start, then a harder
    // acceleration (2 = like falling).
    easePower: 2.2,
    // A soft band of this color rises from the bottom of the screen over the
    // landing's background, until it fills the screen at `duration`.
    color: atelierBackground,
    // Height of that soft band, as a fraction of the screen height.
    bandSoftness: 0.35,
  },

  // The way to the next page.
  transition: {
    href: "/atelier",
    // The atelier's background: the dive (and the fade) end on exactly it.
    color: atelierBackground,
    // prefers-reduced-motion only: no dive, just a fade of this many seconds.
    fadeDuration: 0.6,
  },

  // The page after the landing: a green cutting mat seen from above.
  atelier: {
    background: atelierBackground,
    // The printed lines of the mat. All sizes in CSS pixels and fixed: a
    // bigger screen shows more mat, it is never stretched.
    mat: {
      lineColor: palette.sage,
      accentColor: palette.lilac,
      smallGrid: 12, // spacing of the fine grid
      smallGridOpacity: 0.18,
      bigGrid: 60, // spacing of the coarse grid
      bigGridOpacity: 0.45,
      // Graduated rulers along the top and left edges.
      ruler: { shortTick: 5, longTick: 12, opacity: 0.7 },
      // Big arcs and one diagonal line: faint construction lines.
      arcOpacity: 0.3,
      diagonalAngle: 58, // degrees, rising from the bottom-left corner
      protractorRadius: 64, // bottom-left corner
      stencilOpacity: 0.55, // small circles and triangles, bottom-right
      // The lines fade in over the green that is already on screen when the
      // page opens (the dive ends on exactly that green).
      fadeIn: 0.45, // seconds
    },
  },

  // The header of every page after the landing: only the logo, top left.
  siteHeader: {
    href: "/atelier",
    // White: contrast 4.3 on the green, against 2.9 for sage.
    logoColor: palette.white,
    // Logo text size in CSS pixels: phones, and screens from 768px wide.
    logoSize: 21,
    logoSizeLarge: 26,
  },

  // The small texts over the scene.
  hint: {
    skip: "intră →",
    color: palette.ink, // readable over the flowers
  },

  // Settings that trade a little sharpness for speed.
  performance: {
    // Screens at least this wide (CSS pixels) count as large.
    largeScreen: 1024,
    // Most device pixels per CSS pixel the 3D scene renders at. Large screens
    // already have many pixels, so they get less (1 = no extra sharpness).
    maxDpr: 2,
    maxDprLargeScreen: 1.5,
  },

  physics: {
    // Starts only at the tap; until then nothing is simulated.
    gravity: [0, -30, 0] as Vec3,
    restitution: 0.45, // bounciness, 0 = thud, 1 = bounces forever
    friction: 0.7,
    linearDamping: 0.15,
    angularDamping: 1,
  },

  // Squash & stretch: a short wobble of the visible mesh when a letter hits
  // something. The collider is not scaled, so physics is unaffected.
  squash: {
    minImpact: 4, // sudden speed change (units/s) needed to trigger it
    perSpeed: 0.012, // squash amount per unit of speed change
    max: 0.16, // largest squash (0.16 = 16% flatter)
    stretch: 0.5, // how much it widens sideways while flattened
    frequency: 5, // wobbles per second
    decay: 9, // how fast the wobble dies out
    duration: 0.6, // seconds after which the mesh is reset
  },

  debug: {
    // Initial state of the debug toggle in /lab: collider wireframes.
    enabled: false,
  },

  // Invisible side walls, on the left and right edges of the screen. There is
  // no floor: letters fall out through the bottom.
  bounds: {
    // Fraction of the screen the letters may use (1 = right up to the edges).
    screenFraction: 1,
    wallThickness: 4,
    wallSize: 200,
  },
};
