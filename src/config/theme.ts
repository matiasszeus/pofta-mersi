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
  ribbon: "#F2C14E", // the bookmark ribbon
  forest: "#0E3322", // dark green: the layer that darkens the mat
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

    // The objects lying on the mat (the album): each is a
    // picture (PNG with a transparent background) linking to its page.
    //
    // Place, per screen orientation (portrait = taller than wide, landscape
    // = wider than tall): the point (anchorX * screen width + x, anchorY *
    // screen height + y), in CSS px, is where the object's alignX / alignY
    // point goes (0 = its left / top edge, 0.5 = its middle). An object
    // anchored to the top (anchorY 0) is kept below the iPhone's status bar.
    // Width: widthVw % of the screen width, but never more than maxWidth px
    // nor taller than maxHeightVh % of the screen height.
    objects: [
      {
        key: "album",
        src: "/images/atelier/album-3.png",
        width: 774, // the image file's real size, in pixels
        height: 989,
        alt: "Albumul cu stickerele Pofta Mersi",
        href: "/album",
        ariaLabel: "Album", // what screen readers announce for the link
        // Portrait: big, centred, its top edge at 23% of the height; on short
        // phones (under ~700px) at most 44% of the height, so the note and the
        // bottom corner letters still fit under it without touching.
        // Landscape: in the middle of the screen.
        portrait: {
          anchorX: 0.5, alignX: 0.5, x: 0,
          anchorY: 0.23, alignY: 0, y: 0,
          widthVw: 67, maxWidth: 380, maxHeightVh: 44,
        },
        landscape: {
          anchorX: 0.5, alignX: 0.5, x: 0,
          anchorY: 0.5, alignY: 0.5, y: 0,
          widthVw: 26, maxWidth: 380, maxHeightVh: 62,
        },
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
      // On the mat, its own place on the screen (it does not follow the
      // album), per orientation: its top-left corner at (left * screen width,
      // top * screen height); width like the objects' (widthVw, maxWidth,
      // maxHeightVh); the height follows the paper picture.
      // Free mat always shows between it and the album: on screens too short
      // for the place below, it moves down (clearOf "below") or right
      // (clearOf "right") until it is `gap` px clear of the album's box.
      place: {
        portrait: {
          left: 0.53, top: 0.71,
          widthVw: 32, maxWidth: 170, maxHeightVh: 15,
          clearOf: "below" as "below" | "right", gap: 24,
        },
        // Right of the album and lower, well apart from it.
        landscape: {
          left: 0.66, top: 0.6,
          widthVw: 14, maxWidth: 200, maxHeightVh: 28,
          clearOf: "right" as "below" | "right", gap: 40,
        },
      },
      rotation: 6,
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
      // edge. size: how big the letter shows (its height; the same on every
      // screen, fewer letters on small ones), as a fraction of the screen's
      // shorter side: 0.17 = ~66px on a 390px wide phone.
      // rotation: degrees, clockwise (like CSS). They land in this order.
      // Only around the edges and in the corners, never over the album or
      // the note.
      portrait: [
        { char: "P", x: -0.05, y: 0.09, size: 0.18, rotation: -20 },
        { char: "F", x: 0.77, y: 0.07, size: 0.17, rotation: 18 },
        { char: "T", x: 0.83, y: 0.39, size: 0.17, rotation: 80 },
        { char: "O", x: -0.03, y: 0.5, size: 0.17, rotation: -10 },
        { char: "A", x: 0.08, y: 0.73, size: 0.17, rotation: 12 },
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
        { char: "A", x: 0.19, y: 0.7, size: 0.12, rotation: 12 },
        { char: "M", x: -0.03, y: 0.78, size: 0.14, rotation: 70 },
        { char: "S", x: 0.86, y: 0.78, size: 0.125, rotation: -16 },
        { char: "I", x: 0.22, y: 0.1, size: 0.11, rotation: 35 },
      ],
      // Smaller screens get fewer letters, never smaller ones. Decided once,
      // when the page opens (turning the phone neither adds nor removes
      // any); the others are not even built.
      //   corners    always there
      //   dropOrder  the others, removed group by group, first group first
      //   minHeight  screen height (CSS px) a letter needs to be there
      // On top of that, a letter that would still touch the album or the
      // note takes its whole group (and all groups before it) away.
      keep: {
        corners: ["P", "F", "M", "S"],
        dropOrder: [["I"], ["O", "T"], ["A"]],
        minHeight: { I: 650, O: 700, T: 700, A: 700 } as Record<string, number>,
      },
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

  // The album. Its front is one picture (the cover, straight, seen from the
  // front); the rest is drawn in code: the stack of pages behind it (its
  // thickness), the black back board, the cover's inside and the pages.
  // For now only on /lab/album, where it also lies on the mat: tapped, it
  // lifts, flies to the middle and opens. Sizes in CSS px unless noted.
  album: {
    cover: { src: "/images/album/coperta.png", width: 665, height: 862 },
    // The stack of cream pages showing under the cover's right and bottom
    // edges, and the back board around it, as fractions of the cover's
    // width (0.057 = 18px when the cover is 318px wide: open on a phone).
    thickness: 0.057,
    boardEdge: 0.014,
    // The open book's cover width: the whole book (cover + thickness +
    // board) is the screen width minus sideMargin on each side, never more
    // than maxWidth px wide (the cover) nor taller than maxHeightVh % of the
    // screen height. Wide screens show two pages side by side, so there the
    // open book (cover lying left + pages) has to fit instead.
    book: { sideMargin: 25, maxWidth: 440, maxHeightVh: 74 },
    // From this screen width (CSS px) on: two pages side by side.
    spreadMinWidth: 700,
    // The open book sits this much (fraction of the screen height) above
    // the middle, so the ribbon hanging under it fits too.
    offsetY: -0.02,
    // Distance from the eye to the screen for the 3D (px). Smaller = the
    // turning cover looks closer and bigger.
    perspective: 1800,
    // Shadows on the mat: lying (close and tight), and in the air (wide and
    // soft; it fades in while the book lifts).
    shadowRest: "4px 6px 7px rgb(0 0 0 / 0.4)",
    shadowLifted: "0 26px 50px rgb(0 0 0 / 0.42), 0 6px 14px rgb(0 0 0 / 0.25)",
    colors: {
      board: palette.coverBlack,
      // The inside of the cover: lilac with sage dots.
      lining: palette.lilac,
      liningDots: palette.sage,
      paper: palette.paper,
      // The fine lines on the edge of the stack of pages.
      pageEdges: "rgb(29 38 51 / 0.16)",
      ink: palette.ink,
      ribbon: palette.ribbon,
    },
    // Each section's color (the dot in the contents, its tab on the edge).
    sectionColors: {
      stickere: palette.lilac,
      bratari: palette.sage,
      tricouri: palette.lilac,
      "tote-bags": palette.sage,
    } as Record<string, string>,

    // The contents page. Sizes as fractions of the page's width.
    contents: {
      padding: { top: 0.12, x: 0.1 },
      titleSize: 0.16,
      listTop: 0.09, // space under the title
      itemSize: 0.08,
      itemGap: 0.07,
      dot: 0.035,
      numberSize: 0.06,
      soonOpacity: 0.4,
    },
    // The coloured tabs on the pages' right edge, one per section that has
    // pages: they reach past the stack and the board. Fractions of the
    // page's width (top: of its height).
    tabs: { top: 0.1, height: 0.2, gap: 0.015, out: 0.115, textSize: 0.034 },
    // The ribbon hanging out at the bottom (fractions of the page's width).
    bookmark: { left: 0.68, width: 0.07, hang: 0.15 },

    // The opening: one movement from the tap. Seconds; easings as CSS.
    opening: {
      // The book leaves its place on the mat, rises towards you (liftScale
      // times bigger than on the straight way, at liftAt of the time),
      // straightens and settles in the middle.
      flight: { duration: 1.2, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)", liftScale: 1.06, liftAt: 0.45 },
      // Meanwhile the cover turns open around the spine, starting `delay`
      // after the tap. On wide screens the book slides half a cover to the
      // right at the same time, so both pages end up centred.
      cover: { delay: 0.08, duration: 1.2, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)" },
      // The mat darkens during the whole flight.
      dim: { color: palette.forest, opacity: 0.22 },
      // prefers-reduced-motion: no movement; the book fades out on the mat
      // and fades in open in the middle.
      reducedMotionFade: 0.4,
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
