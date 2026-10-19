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

    // The objects lying on the mat (the album): each is a
    // picture (PNG with a transparent background) linking to its page.
    //
    // Place, per screen type (phone / from 768px wide): the point
    // (anchorX * screen width + x, anchorY * screen height + y), in CSS px,
    // is where the object's corner (align 0) or middle (align 0.5) goes. An
    // object anchored to the top (anchorY 0) is kept below the iPhone's
    // status bar. Width: widthVw % of the screen, never more than maxWidth.
    objects: [
      {
        key: "album",
        src: "/images/atelier/album.png",
        width: 774, // the image file's real size, in pixels
        height: 898,
        alt: "Albumul cu stickerele Pofta Mersi",
        href: "/album",
        ariaLabel: "Album", // what screen readers announce for the link
        // In the middle, a little above it (balancing the logo at the top).
        phone: { anchorX: 0.5, anchorY: 0.47, x: 0, y: 0, align: 0.5, widthVw: 55, maxWidth: 380 },
        large: { anchorX: 0.5, anchorY: 0.48, x: 0, y: 0, align: 0.5, widthVw: 55, maxWidth: 380 },
        rotation: -4, // degrees
      },
    ],

    // The handwritten note next to the album (text: config/content.ts). On
    // the mat it is small and its text unreadable; tapped, it is lifted off
    // the mat and shown big in the middle. Sizes in CSS px, angles in degrees.
    note: {
      // The note is three layers, always all there (only their opacity
      // changes), so the paper never changes:
      //   paper  the blank torn sheet, the same on the mat and opened; its
      //          size in pixels gives the sheet's proportions
      //   scribbles  ink scribbles on a transparent background, in the text
      //              area: what the note seems to say on the mat
      //   text   the real text from content.ts, in the same area
      paper: { src: "/images/atelier/notita.png", width: 898, height: 897 },
      scribbles: { src: "/images/atelier/notita-cerneala.png", width: 698, height: 418 },
      // Where the text may go, as % of the picture from each side, so it
      // never reaches the torn edge (left and bottom) or the tape (top).
      // Measured on notita.png: the paper starts at ~2% from the left at the
      // top, ~11% halfway down, ~17% at 70% down; at the bottom it ends at
      // ~62% (left) to ~94% (right). Plus a ~4% margin.
      textArea: { top: 16, right: 8, bottom: 29, left: 22 },
      // Text size as % of the sheet's width (so it scales with the sheet:
      // ~21px opened on a phone). If the text is too long for the area it is
      // made smaller, down to minSize.
      text: { size: 6.3, minSize: 3.5, lineHeight: 1.35 },
      ink: palette.ink,
      tape: palette.lilac, // the washi tape holding it at the top
      tapeOpacity: 0.65,
      // On the mat: its width (phone / screens from 768px) and turn; the
      // height follows the paper picture.
      size: { phone: { width: 110 }, large: { width: 140 } },
      rotation: 7,
      // It fades in together with the mat's lines (same fade, same moment
      // they start), this many seconds after them.
      appearDelay: 0.1,
      // Where its middle goes, measured from the album's middle: albumX
      // album widths + x px across, albumY album heights + y px down. Phones:
      // under the album's right half; wider screens: right of the album.
      place: {
        phone: { albumX: 0.5, x: -60, albumY: 0.5, y: 95 },
        large: { albumX: 0.5, x: 100, albumY: 0.25, y: 0 },
      },
      // Soft shadow on the mat, following the torn outline (a blurred dark
      // copy of the picture, offset like the album's): x, y, blur in px as
      // seen on the mat.
      shadow: { x: 4, y: 6, blur: 6, opacity: 0.35 },
      // When the album hits the mat, the note's loose corner lifts a little
      // and falls back, as if the air moved the paper.
      flutter: { duration: 0.4, lift: 18 },
      // Keyboard focus only (never after a tap or click): a thin outline that
      // follows the paper's shape.
      focusRing: { color: palette.lilac, width: 1.5 },
      // Opened (tapped): big in the middle of the screen.
      open: {
        width: 340, // phones; the height keeps the paper's proportions
        widthLarge: 460,
        rotation: -2,
        // Lifting off and putting back, in seconds, slowing down smoothly
        // at the end.
        duration: 0.55,
        closeDuration: 0.45,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        // While it is in the hand, the sheet tilts a little in 3D (degrees,
        // around its horizontal axis); when put back it settles with a tiny
        // tilt the other way.
        tilt: 9,
        settle: -1.5,
        // Parts of the opening (0..1) in which the scribbles fade out and the
        // text fades in; they overlap a little, so one turns into the other.
        // Closing does the same backwards.
        inkOut: [0, 0.4],
        textIn: [0.3, 0.7],
        // At most this long (seconds) a tap waits for the font and pictures
        // to be ready before opening anyway (they are loaded in advance, so
        // normally there is nothing to wait for).
        readyTimeout: 0.3,
        // The shadow when opened: bigger and softer (x, y, blur in px).
        shadow: { x: 10, y: 18, blur: 22, opacity: 0.45 },
        backdrop: palette.ink, // the layer over the atelier
        backdropOpacity: 0.55,
        backdropBlur: 4, // px
      },
    },

    // How the objects look and move (shared by all of them).
    object: {
      // Soft shadow following the object's outline: a darkened, blurred copy
      // of the image, offset down-right like the letters' shadows (light
      // from the upper left). x / y in px; scale > 1 = spread wider.
      shadow: {
        blur: 8, // px, fixed (blurred once, never re-computed)
        rest: { x: 6, y: 8, scale: 1, opacity: 0.4 },
        hover: { x: 11, y: 15, scale: 1.03, opacity: 0.3 },
      },
      hoverScale: 1.03,
      hoverDuration: 0.18, // seconds
      // Every time the atelier appears: as soon as the last letter lands, the objects
      // are slammed down on the mat, one after the other. Each starts in the
      // air (we look from above: bigger, turned a bit more, with a wide faint
      // shadow), falls faster and faster, squashes a little on impact while
      // its shadow snaps tight, then settles.
      slam: {
        // When the first object starts falling, in seconds, relative to the
        // moment the last letter touches the mat: 0 = right then, negative =
        // already while that letter is still falling (the falls overlap, so
        // the object lands right after it).
        delay: -0.3,
        stagger: 0.3, // seconds between one object and the next
        fall: 0.4, // seconds from the air to the impact
        startScale: 1.3,
        startTurn: -7, // extra degrees of turn in the air
        squash: 0.97, // scale at the squash after impact
        squashDuration: 0.14, // seconds from the impact back to rest
        // The shadow in the air, and right at the impact (tight and dark).
        shadowStart: { x: 26, y: 36, scale: 1.25, opacity: 0.12 },
        shadowImpact: { x: 3, y: 4, scale: 0.97, opacity: 0.55 },
      },
      // After its slam: the shadow swells once and comes back, a hint that
      // the object can be pressed (uses the hover pose).
      pulse: { delay: 0.3, duration: 0.7 },
      // With reduced motion: no slam, just a short fade in.
      reducedMotionFade: 0.25, // seconds
      // If the letters never report that they landed (e.g. no WebGL), show
      // the objects anyway after this many seconds.
      fallbackDelay: 3,
    },

    // A few letters from the landing, lying on the mat. Every time the
    // atelier appears they land with a bounce (with reduced motion they are
    // just there).
    // Units: CSS pixels and degrees.
    letters: {
      // Each letter: where its middle lies, measured inwards from a corner of
      // the screen (tl = top-left, tr, bl, br), its font size, and its turn.
      // A frame around the album in the middle, one letter per corner, each
      // partly cut off by the edge; none over the album or the logo.
      // Checked on 390x844, 375x667, 768x1024, 1280x720 and 1440x900.
      phone: [
        { char: "I", corner: "tl", x: 22, y: 122, size: 86, rotation: -62 },
        { char: "P", corner: "tr", x: 40, y: 128, size: 90, rotation: -18 },
        { char: "M", corner: "bl", x: 40, y: 112, size: 94, rotation: 16 },
        { char: "O", corner: "br", x: 45, y: 118, size: 79, rotation: 12 },
      ],
      // Screens from `wideFrom` px wide: same letters along a wider frame.
      wide: [
        { char: "I", corner: "tl", x: 60, y: 175, size: 160, rotation: -64 },
        { char: "P", corner: "tr", x: 150, y: 160, size: 165, rotation: -16 },
        { char: "M", corner: "bl", x: 190, y: 120, size: 170, rotation: 14 },
        { char: "O", corner: "br", x: 160, y: 150, size: 150, rotation: 10 },
      ],
      wideFrom: 768,
      // How the camera looks down at the mat (vertical field of view, degrees).
      // Narrower = flatter, less "falling towards you".
      fov: 35,
      // The landing animation. Total: stagger * 3 + fall + bounce (< 1 s).
      fall: {
        stagger: 0.07, // seconds between letters
        duration: 0.5, // seconds from the start height down to the mat
        // Start height, as a fraction of the camera's height above the mat
        // (0.6 = 60% of the way up: the letter looks ~2.5x bigger).
        startHeight: 0.6,
        spin: 25, // extra turn at the start, unwinding as it falls (degrees)
        bounceHeight: 0.15, // in letter sizes
        bounceDuration: 0.2, // seconds
      },
      // When an object slams down, the letters near it jolt: pushed a few
      // pixels away from it and back, with a little hop. Further than
      // `reach` px from the object's middle they do not move.
      jolt: { distance: 6, hop: 4, reach: 600, frequency: 9, decay: 9, duration: 0.45 },
      // Soft shadow on the mat, cast by a light from high up, slightly to
      // the upper left: far from the mat the shadow is offset and blurred,
      // and it gathers under the letter as it lands.
      shadow: {
        color: palette.ink,
        opacity: 0.35,
        lightDirection: [-0.3, 0.4, 1] as Vec3, // towards the light
        blurLanded: 6,
        blurHigh: 24,
        mapSize: 1024,
      },
    },
  },

  // The header of every page after the landing: only the logo, top left.
  siteHeader: {
    href: "/atelier",
    // White: contrast 4.3 on the green, against 2.9 for sage.
    logoColor: palette.white,
    // Logo text size in CSS pixels: phones, and screens from 768px wide.
    logoSize: 28,
    logoSizeLarge: 36,
  },

  // Big page titles on the pages after the landing (Craze Retro: A–Z only,
  // no diacritics). Sizes in CSS px: phones / screens from 768px.
  pageTitle: {
    color: palette.white,
    size: 44,
    sizeLarge: 72,
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
