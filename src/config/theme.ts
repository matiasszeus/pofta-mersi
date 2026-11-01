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
  // The album.
  paper: "#F4EEE0", // cream pages
  coverBlack: "#1B1B1D", // its hard cover (as in the album photo)
  // Warm accent, only for small objects: the album's bookmark ribbon and
  // the price tags.
  mustar: "#F2C14E",
  forest: "#081E12", // very dark green: the layer that darkens the mat
  pageLine: "#C9C2B2", // the lines on the edge of the stack of pages
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
    mustar: palette.mustar,
    // One color per letter, reused in a loop if there are more letters than colors.
    letters: [palette.ink],
  },

  // The landing's background image behind the 3D scene: flowers rendered once
  // as a still image (see public/images/landing/). Portrait screens get the
  // tall version, everything else the wide one.
  landing: {
    flowersPortrait: "/images/landing/flowers-portrait.webp",
    flowersLandscape: "/images/landing/flowers-landscape.webp",
    // Seconds the still picture of the title (shown until the 3D scene is
    // ready) takes to fade out over the identical 3D letters.
    titleSwap: 0.25,
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
    // The size is rounded down to steps of this (world units), so resizing a
    // window does not rebuild the letters on every pixel. Small, so the
    // static title picture (StaticTitle) matches the 3D letters closely.
    sizeStep: 0.01,
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
    // A tap while the 3D scene is still loading waits up to this many
    // seconds for it, then dives; if it is still not there, the rising
    // color plays instead (no letters).
    sceneWait: 3,
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

    // Where the album, the note and the calculator lie on the mat, measured
    // on two references (each one's top-left corner before its turn, and
    // width), as % of the visible part of the screen: left and width of
    // its width, top of its height. Turns in degrees (clockwise, like CSS).
    layout: {
      // Screens held upright (phones, tablets):
      // docs/atelier-calc-telefon-referinta.png, 393 x 633 (Safari on an
      // iPhone, between its bars). Taller screens keep these proportions
      // (% of their width and height); screens wider for their height
      // (tablets, short phones) get the reference made bigger / smaller
      // by their height, in the middle of the width.
      //   album  76, 89, 221 px wide. On a screen too short for it, smaller
      //          (around its middle, never under albumMinScale times) until
      //          `gap` px clear of the note.
      //   note   261, 428, 99 px wide
      //   calc   35, (464), 112 px wide: its lowest corner (it is turned)
      //          `bottom` px above the bottom of the visible part, whatever
      //          the height, so a little mat shows under it. Smaller
      //          (never under minWidth px) where it would come closer than
      //          `gap` px to the album or the note.
      phone: {
        reference: { width: 393, height: 633 },
        album: { left: 19.34, top: 14.06, width: 56.23, rotation: -10 },
        note: { left: 66.41, top: 67.61, width: 25.19, rotation: 6 },
        calc: { left: 8.91, width: 28.5, bottom: 12, minWidth: 96, rotation: -26 },
        albumMinScale: 0.8,
        gap: 8,
      },
      // Screens held sideways (desktops, tablets, phones):
      // docs/atelier-calc-desktop-referinta.png, 1916 x 967.
      //   album  699, 179, 470 px wide
      //   calc   334, 560, 196 px wide (~170 px left of the album)
      //   note   1355, 327, 250 px wide (~160 px right of the album; its
      //          top at about a quarter of the album's height)
      // On screens wider for their height than the reference, all three
      // are smaller (around their middles) by as much, so they still fit
      // the height. The free mat between the album and the calculator /
      // the note shrinks with the screen, but never under minGap px.
      wide: {
        reference: { width: 1916, height: 967 },
        album: { left: 36.48, top: 18.51, width: 24.53, rotation: -4 },
        calc: { left: 17.43, top: 57.91, width: 10.23, rotation: -8 },
        note: { left: 70.72, top: 33.82, width: 13.05, rotation: 6 },
        minGap: 40,
      },
    },

    // The objects lying on the mat (the album): each is a picture (PNG
    // with a transparent background) linking to its page. Where: `layout`.
    objects: [
      {
        key: "album",
        src: "/images/atelier/album-3.png",
        width: 774, // the image file's real size, in pixels
        height: 989,
        alt: "Albumul cu stickerele Pofta Mersi",
        href: "/album",
        ariaLabel: "Album", // what screen readers announce for the link
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
      // Its place and turn on the mat: `layout`.
      // It fades in together with the mat's lines (same fade, same moment
      // they start), this many seconds after them.
      appearDelay: 0.1,
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

    // The pocket calculator on the mat: the cart (links to /cos). It shows
    // the number of pieces in the cart (LED, top right) and their total in
    // lei (the LCD). Looks: docs/calculator-cos-referinta.html, where it is
    // 180px wide; every size scales with its width.
    calc: {
      // Its place, size and turn: `layout`.
      ratio: 248 / 180, // height / width
      // It fades in together with the note.
      colors: {
        body: ["#2B3442", palette.ink, "#141B25"], // gradient, top-left to bottom-right
        shadow: "rgb(16 24 33 / 0.45)",
        brand: palette.lilac, // "MERSI"
        brandSmall: "rgb(244 238 224 / 0.55)", // "CALC"
        led: palette.neon, // the pieces' count
        ledBackground: "#0A0D12",
        lcd: ["#C8D9BE", "#B4C9A8"], // gradient, top to bottom
        lcdFrame: "#0E141C",
        lcdDigits: palette.ink,
        keyDigit: palette.paper,
        keyOperation: palette.lilac,
        keyClear: "#E9867A",
        keyEquals: palette.sage,
        keyText: palette.ink,
      },
      // Segments that are off: "8"s this faint (LED / LCD); lit LCD ones.
      ledOff: 0.1,
      lcdOff: 0.07,
      lcdOn: 0.92,
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
    letters: {
      // Each letter, per orientation: the top-left corner of its box (a
      // square, `size` wide) at (x * screen width, y * screen height), the
      // letter centred in it; negative or near 1 = partly cut off by the
      // edge. size: how big the letter shows (its height), as a fraction
      // of the width the phone reference gets on this screen (upright
      // screens: 0.17 = ~66px on a 390px wide phone), or of the desktop
      // reference's height (sideways): made bigger / smaller with the
      // album and the rest (see layout).
      // rotation: degrees, clockwise (like CSS). They land in this order.
      // Only around the edges and in the corners, never over the album or
      // the note.
      portrait: [
        { char: "P", x: -0.05, y: 0.09, size: 0.18, rotation: -20 },
        { char: "F", x: 0.77, y: 0.07, size: 0.17, rotation: 18 },
        { char: "T", x: 0.83, y: 0.39, size: 0.17, rotation: 80 },
        // Top, between P and F (not on phones: see `phone`).
        { char: "O", x: 0.4, y: 0.04, size: 0.17, rotation: -12 },
        { char: "M", x: -0.08, y: 0.86, size: 0.19, rotation: 70 },
        { char: "S", x: 0.76, y: 0.88, size: 0.18, rotation: -16 },
        { char: "I", x: 0.44, y: 0.9, size: 0.16, rotation: 35 },
      ],
      // Wide screens: along the left and right edges, the album in the
      // middle, the note right of it.
      landscape: [
        { char: "P", x: -0.02, y: 0.05, size: 0.13, rotation: -20 },
        { char: "F", x: 0.84, y: 0.04, size: 0.125, rotation: 18 },
        { char: "T", x: 0.89, y: 0.38, size: 0.125, rotation: 80 },
        { char: "O", x: 0.06, y: 0.4, size: 0.12, rotation: -10 },
        { char: "M", x: -0.03, y: 0.78, size: 0.14, rotation: 70 },
        { char: "S", x: 0.86, y: 0.78, size: 0.125, rotation: -16 },
        { char: "I", x: 0.22, y: 0.1, size: 0.11, rotation: 35 },
      ],
      // Which letters lie on the mat. Decided once, when the page opens
      // (turning the phone neither adds nor removes any); the others are
      // not even built.
      //   corners    always there (those the screen has: see `phone`)
      //   dropOrder  tablets and desktops: the others, removed group by
      //              group, first group first, when a letter of a group
      //              still touches something after being moved (see
      //              clearance below; it takes its whole group, and all
      //              groups before it, away)
      // A letter that would touch the album, the note or the calculator is
      // moved first: to the nearest place where it touches nothing.
      keep: {
        corners: ["P", "F", "M", "S"],
        dropOrder: [["I"], ["O", "T"]],
      },
      // Screens held upright (phones, tablets: the phone layout, see
      // layout.phone): only P, F (top) and S (bottom); the others are left
      // out altogether (not even built). These are moved (x, y, rotation
      // as above): F up, partly over the top edge on purpose (247, -17 px
      // on docs/atelier-calc-telefon-referinta.png).
      phone: {
        without: ["O", "T", "I", "M"],
        moved: { F: { x: 0.6285, y: -0.0269, rotation: 18 } } as Record<
          string,
          { x?: number; y?: number; rotation?: number }
        >,
      },
      // Phones (portrait) only: the letters drawn this many times their
      // size (0.85 = 15% smaller), so the mat does not look crowded. Each
      // letter keeps its place (the middle of its box).
      phoneScale: 0.85,
      // Upright screens less than `height` CSS px tall: the letters drawn
      // `scale` times smaller still (0.94 = 6%), for a little more air.
      short: { height: 760, scale: 0.94 },
      // Free mat kept between a letter and the real outline (turned, with
      // all that sticks out) of the album, the note and the calculator, in
      // CSS px.
      clearance: 12,
      // For that check a letter counts as the middle part of its box: this
      // fraction is trimmed from each side (a turned letter's corners do not
      // reach the box's corners).
      boxInset: 0.1,
      // How tall the font's letters are, as a fraction of its font size
      // (Craze Retro: 0.695, measured in its typeface JSON). Turns `size`
      // above into a font size; update it if the font changes.
      glyphHeight: 0.695,
      // How the camera looks down at the mat (vertical field of view, degrees).
      // Narrower = flatter, less "falling towards you".
      fov: 35,
      // The landing animation. Total: stagger * (letters - 1) + fall + bounce
      // (about 1.2 s with 8 letters).
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

  // The album lying on the atelier's mat (/atelier, /lab/album):
  // tapped, it rises, settles in the middle of the screen and opens. All
  // values come from the approved prototype (docs/album-deschidere-
  // referinta.html).
  //
  // Sizes of its parts are in "u": px on a page 318px wide; they scale with
  // the page (on a 390px phone the page is 340px wide, so 1u = 1.069px).
  // The front of the cover is one picture; everything else is drawn.
  album: {
    cover: { src: "/images/album/coperta.png", width: 665, height: 862 },
    unitWidth: 318, // the page width at which 1u = 1px
    // The page (the open book's right side): height / width; its width is
    // the screen width minus sideMargin on each side (phones), never more
    // than maxWidth px nor taller than maxHeightVh % of the screen height.
    // Wide screens show both pages: there the open cover, the page, the
    // board and the tabs together have to fit (spreadWidth = their width
    // in page widths).
    page: { ratio: 453 / 340, sideMargin: 25, maxWidth: 400, maxHeightVh: 74 },
    spreadMinWidth: 700, // from this screen width on: both pages side by side
    spreadWidth: 2.12,
    // The open book sits this much (fraction of the screen height) above
    // the middle (the prototype: 27.5px on an 844px screen).
    offsetY: -0.0326,
    perspective: 1900, // px: distance from the eye for the 3D

    // The layers, from the back: board, stack of pages (its edges), the
    // page underneath, the sheet (the contents on its front), the cover.
    thickness: 18, // u: the stack of pages showing right of and below
    board: {
      // u: how far it reaches past the page (top, and right / bottom
      // past the stack); corner radius on the right.
      top: 6,
      beyond: 4,
      radius: 8,
      // Its shadow lying on the mat, and in the air (it grows into that
      // while the book lifts; sizes ending in "u" are in u).
      shadowRest: "0 6px 10px rgb(8 30 18 / 0.35)",
      shadowLifted: "0 24u 46u rgb(8 30 18 / 0.45), 0 4u 10u rgb(8 30 18 / 0.35)",
      shadowDuration: 1.1, // seconds, ease
    },
    // The cover reaches past the page by `over` u at the top, bottom and
    // right; corner radii in u.
    coverParts: { over: 6, radiusSpine: 3, radiusEdge: 9 },
    pageRadius: 4, // u, on the outer corners of the pages
    ribbon: { left: 206, width: 16, height: 46, below: 38 }, // u
    // The chapters' tabs on the edge (u): the first `top` from the page's
    // top, each next one `step` lower.
    tabs: { width: 24, height: 74, radius: 7, textSize: 10, top: 40, step: 80 },
    // The contents page (u).
    contents: {
      padding: { top: 34, right: 28, bottom: 30, left: 34 },
      titleSize: 42,
      titleTurn: -2, // degrees
      listTop: 34,
      rowGap: 20,
      itemSize: 21,
      numberSize: 15,
      dot: 10,
      soonOpacity: 0.45,
    },
    pageNumber: { size: 12, bottom: 14, side: 20 }, // u
    // While the album is open the mat behind it steps back (opacity only,
    // never a blur: cheap for a phone): a vignette between the mat and the
    // album, dimCenter in the middle to dimEdge at the edges; the things
    // lying on the mat (3D letters, calculator, note) at objectsOpacity.
    // Both fade in over dimFade seconds as the album lifts (with its
    // flight's easing), and out as it is closed.
    dimCenter: "rgb(16 24 33 / 0.3)",
    dimEdge: "rgb(16 24 33 / 0.62)",
    objectsOpacity: 0.35,
    dimFade: 0.4,
    dividerBlurbSize: 21, // u: the line under a divider's title (~22px on a phone)
    // Pictures lying on a chapter's divider, under its title (per chapter
    // id; cut off at the page's edges). src: a transparent WebP of
    // width x height px; left, top, size (its width): u, its top-left
    // corner before its turn (degrees).
    //   bratari: the two bands made wavy by scripts/bratara-ondulata.py
    //   (from assets-src/bratari/): Synthesis across the top-left corner,
    //   Basalt across the bottom, both reaching past the edge.
    dividerPictures: {
      bratari: [
        {
          src: "/images/bratari/synthesis-ondulat.webp",
          width: 1100,
          height: 205,
          left: -121.6,
          top: 41.2,
          size: 505,
          rotation: -16,
        },
        {
          src: "/images/bratari/basalt-ondulat.webp",
          width: 1100,
          height: 192,
          left: -9.4,
          top: 263.7,
          size: 505,
          rotation: -12,
        },
      ],
    } as Record<string, { src: string; width: number; height: number; left: number; top: number; size: number; rotation: number }[]>,
    // A chapter's page (u): its title top left, the subtitle under it. A
    // page without the title: the subtitle alone, a little bigger (16u =
    // ~17px on a phone), about halfway down where the title was.
    chapterPage: {
      left: 26,
      top: 24,
      titleSize: 28,
      subtitleTop: 58,
      subtitleSize: 15,
      subtitleOpacity: 0.75,
      subtitleAlone: { top: 30, size: 16 },
    },
    // Photos stuck on a page (docs/album-bratari-referinta.html), u. A white
    // frame (wider at the bottom, where the caption goes) with a soft
    // shadow; a strip of washi tape on its top edge. places: one per photo,
    // in order (left, top, turn in degrees; the tape's color and turn).
    photos: {
      width: 140,
      height: 170,
      padding: { side: 7, bottom: 30 },
      shadow: "0 3u 6u rgb(29 38 51 / 0.25)",
      tape: { left: 44, top: -8, width: 52, height: 16, opacity: 0.85 },
      places: [
        { left: 22, top: 96, rotation: -4, tape: { color: palette.lilac, rotation: -6 }, labelRotation: -1.5 },
        { left: 168, top: 150, rotation: 3, tape: { color: palette.sage, rotation: 5 }, labelRotation: 1.5 },
      ],
      // The handwritten note under them (18u = ~19px on a phone), and its
      // arrow right under it (left: from the page's edge; gap: under the
      // note's last line).
      note: { left: 30, top: 300, width: 140, size: 18, lineHeight: 1.2, rotation: -3 },
      arrow: { left: 120, gap: 4, width: 56 },
    },
    // On a photo with a video: a play button in its middle (u: 37.4 =
    // ~40px on a phone), over its blurred picture.
    playButton: {
      size: 37.4,
      background: "rgb(29 38 51 / 0.8)", // ink
      color: palette.paper,
      shadow: "0 1px 3px rgb(0 0 0 / 0.35)",
    },
    // A photo tapped on the album's page: it grows from its place into the
    // middle of the screen, with its video (and back when closed).
    //   side      its video's square: the smallest of these (CSS units)
    //   backdrop  the layer over everything else
    //   rotation  degrees, a little crooked
    //   duration  seconds to grow / shrink, with `easing` (as the album's
    //             lift)
    //   swipe     px down that close it on a phone
    zoom: {
      side: { vw: 86, vh: 70, max: 520 },
      backdrop: "rgb(16 24 33 / 0.7)",
      rotation: -2,
      duration: 0.45,
      easing: "cubic-bezier(0.3, 0.7, 0.3, 1)",
      swipe: 70,
    },
    // A Dymo label (a photo's name, stuck on the white of its frame
    // below the picture, centred; labelRotation in photos.places). Sizes
    // in u (11px text on a phone).
    dymo: {
      background: palette.ink,
      color: palette.paper,
      radius: 2,
      padding: { top: 3.7, right: 7.5, bottom: 3.7, left: 9.4 },
      shadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), 0 1px 1px rgb(0 0 0 / 0.3)",
      size: 10.3,
      letterSpacing: "0.18em",
    },
    // The stickers' divider (page 2), as on the canvas board "Pagina 2 · C"
    // (u; a phone's page: 1u = ~1.07px): the title on the left, a fifth of
    // the way down; the offer on a tag (like the bracelets' price tag) on
    // the right under it, clear of the spine's shadow; the credit for the
    // printer at the bottom left: their logo (a WebP with its small shadow
    // in it, never a CSS filter in the 3D album; `size` its width) and a
    // handwritten line, and under them the discount code on washi tape.
    stickereDivider: {
      title: { left: 24.3, top: 84.7, size: 46.8, rotation: -4 },
      offerTag: {
        left: 150,
        top: 150,
        width: 101,
        height: 52.4,
        titleSize: 26.2, // ~28px
        titleTop: 5,
        unitSize: 10.3, // ~11px
        unitOpacity: 0.8,
        rotation: 9,
      },
      credit: {
        logo: {
          src: "/images/parteneri/etichete-creative.webp",
          width: 424,
          height: 209,
          left: 10,
          top: 262,
          size: 141, // the logo itself ~142px wide (the picture has a margin for its shadow)
          rotation: -7,
        },
        text: { left: 164, top: 280, size: 15.9, lineHeight: 1.25, rotation: -3 }, // ~17px
        washi: {
          left: 152,
          top: 337,
          width: 137,
          height: 46,
          rotation: -4,
          color: palette.sage,
          opacity: 0.92,
          clipPath: "polygon(2% 6%, 0 30%, 3% 52%, 1% 78%, 3% 100%, 97% 96%, 100% 72%, 98% 48%, 100% 22%, 98% 0)",
          gap: 4,
          labelSize: 9.4, // ~10px
          codeSize: 13.1, // ~14px
          copiedFor: 1.5, // seconds "copiat!" shows
        },
      },
    },
    // A price tag (u), high in the free space above the second photo: a
    // mustard label pointed on the left (its tip `tip` of its width),
    // turned, with a small hole in the tip and a thin thread from it
    // curving up-left. Its title big, centred, at the top; its unit small
    // in the bottom-right corner.
    priceTag: {
      left: 200,
      top: 36,
      width: 90,
      height: 47,
      tip: 0.18,
      rotation: 9,
      color: palette.mustar,
      shadow: "0 2u 3u rgb(29 38 51 / 0.3)",
      hole: { size: 5.6, color: palette.paper },
      // reach: how far up and left (u) it goes from the hole.
      thread: { color: palette.ink, opacity: 0.55, width: 1, reach: 40 },
      titleSize: 26, // ~28px on a phone
      titleTop: 4,
      unitSize: 10.3, // ~11px
      unitOpacity: 0.75,
      unitRight: 7,
      unitBottom: 6,
    },
    colors: {
      board: palette.coverBlack,
      paper: palette.paper,
      pageLine: palette.pageLine,
      ink: palette.ink,
      ribbon: palette.mustar,
      // The cover's inside: lilac with sage dots. The chapters' dividers
      // have fine dots, on the chapter's color (content.album.chapters);
      // `divider` for a chapter that has none.
      lining: palette.lilac,
      liningDots: palette.sage,
      divider: palette.lilac,
      // The contents' tab on the edge (the chapters' tabs have their colors).
      contentsTab: palette.mustar,
      // A word in color on a divider (see accent in content.ts): the
      // atelier's green, readable on the light dividers.
      accent: palette.green,
    },

    // The opening: one movement from the tap. Seconds; easings as CSS.
    opening: {
      // The book leaves its place on the mat and, through `lifted` (at
      // `liftAt` of the time: bigger, closer to you, almost straight), ends
      // `settled` in the middle. y in px for a 340px wide page.
      flight: {
        duration: 1.2,
        easing: "cubic-bezier(0.3, 0.7, 0.3, 1)",
        liftAt: 0.45,
        lifted: { y: -34, scale: 1.06, rotation: -1.5 },
        settled: { y: -10 },
      },
      // The cover turns open (rotateY 0 -> -180deg) starting `delay` after
      // the tap. On wide screens the book slides half a page to the right
      // at the same time, so both pages end up centred.
      cover: { delay: 0.16, duration: 1.3, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)" },
      // prefers-reduced-motion: no movement; the book fades out on the mat
      // and fades in open in the middle.
      reducedMotionFade: 0.4,
    },

    // Leafing through, once open (buttons under the book).
    pages: {
      // A sheet turns around the spine (rotateY 0 -> -180deg). On phones
      // the book slides one page width at the same time, so the page you
      // go to is on the screen.
      turn: { duration: 0.95, easing: "cubic-bezier(0.55, 0.05, 0.25, 1)" },
      // prefers-reduced-motion: no turning, a crossfade (seconds, in all).
      reducedMotionFade: 0.3,
      // Leafing fast to a chapter (from the contents), when more than one
      // sheet has to turn (one: a normal turn, as with the buttons): every
      // sheet in between turns like a page, quicker (`duration` seconds,
      // `easing`) and overlapping, like a thumb gathering speed and then
      // slowing down: the first two and the last two start `staggerEdge`
      // seconds after the one before, those in the middle `staggerMid`.
      // The last one (it uncovers the page) turns with the normal turn's
      // easing, in `lastDuration` seconds, so it lands calmly. Never more
      // than `maxTotal` seconds in all: sheets in the middle are skipped
      // (they jump), never the first ones or the last. Smaller numbers =
      // faster.
      flipFast: {
        duration: 0.48,
        staggerEdge: 0.16,
        staggerMid: 0.1,
        lastDuration: 0.75,
        maxTotal: 2.2,
        easing: "cubic-bezier(0.45, 0.05, 0.25, 1)",
      },
      // The buttons and the page's name between them, under the book. px.
      controls: {
        gap: 30, // from the bottom of the ribbon
        button: 48,
        spacing: 18, // between buttons and name
        labelWidth: 120,
        labelSize: 17,
        margin: 12, // kept free under them, to the screen's edge
        fadeIn: 0.4, // seconds, once the cover is open
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

  // Devices can ask for less animation (prefers-reduced-motion: an
  // accessibility setting in iOS, Android, Windows, macOS; on Windows it is
  // on when "Animation effects" is off). false = ignore it: everyone gets
  // the full animations (the owner's choice, Nov 2026). true = honour it:
  // the calmer versions (fades, letters already lying still) come back;
  // they are still in the code.
  motion: { respectReducedMotion: false },

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
    // Initial state of the debug toggle (only on /lab): collider wireframes.
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
