// Single source of truth for the look and feel of the hero.
// Units: 1 = one world unit in the 3D scene (not pixels). Angles are in radians
// unless noted. Tuples are [x, y, z] with y pointing up and z towards the viewer.

type Vec3 = [number, number, number];

// Each font needs two files with the same glyphs: a typeface JSON for the 3D
// letters (Text3D) and an .otf for the flat outlines (<Text>).
const fonts = {
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

// Used in more than one place below.
const landingBackground = "#e6e0f8";
const galleryBackground = "#fbe9dd";

export const theme = {
  fonts,
  // Which of the fonts above to use: "bagel" or "fredoka".
  font: "bagel" as keyof typeof fonts,

  colors: {
    background: landingBackground,
    // One color per letter, reused in a loop if there are more letters than colors.
    letters: [
      "#f7a8c8", // pink
      "#fbc4a4", // peach
      "#c9b6f2", // lavender
      "#a9d2f7", // baby blue
      "#f9b5d9",
      "#fdd3b0",
      "#b9a9ee",
      "#b5e0f5",
      "#f4a0b9",
      "#d8c2f6",
      "#9fc6f3",
    ],
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
    keyIntensity: 2.2,
    keyPosition: [4, 12, 8] as Vec3,
    fillIntensity: 0.6,
    fillPosition: [-6, 5, -4] as Vec3,
  },

  letters: {
    // Each string is one row; every character becomes its own rigid body.
    rows: ["POFTA", "MERSI"],
    // The size is whatever makes the outlines fit the screen (see `outline`),
    // but never larger than this.
    maxSize: 2.4,
    // Shape, as fractions of the letter size, so the proportions survive scaling.
    // depth = the flat middle part; the bevel adds a rounded bulge on the front
    // and on the back (bevelThickness each). Sideways the rounding is bevelSize
    // wide: bevelInset of it is cut into the flat face, the rest makes the
    // letter fatter than the font's outline. Bigger bevel = puffier, but:
    //  - bevelInset above ~0.03 breaks the faces of thin strokes (P, F, M, E, R)
    //  - (bevelSize - bevelInset) above ~0.045 closes up small holes (A)
    depth: 0.12,
    bevelSize: 0.07,
    bevelInset: 0.03,
    bevelThickness: 0.2,
    // Smoothness of the bulge and of the curves in the outline.
    bevelSegments: 12,
    curveSegments: 16,
    // Material (plain for now; the iridescent one comes later).
    roughness: 0.45,
    metalness: 0,
    // Which axes a letter may spin around / move along [x, y, z]. Spinning only
    // around z and never moving in z = it behaves like a sticker sliding on the
    // screen: always facing the camera, always at the depth of its outline.
    rotationAxes: [false, false, true] as [boolean, boolean, boolean],
    moveAxes: [true, true, false] as [boolean, boolean, boolean],
  },

  // The flat outlines in the middle of the screen that the letters sit in.
  outline: {
    color: "#a995e0",
    opacity: 1,
    // Line thickness, as a fraction of the letter size.
    width: 0.03,
    // Empty space left and right, as a fraction of the screen width.
    paddingX: 0.07,
    // The two rows together may be at most this tall (fraction of screen height).
    maxHeight: 0.5,
    // Shifts the block up from the exact center (fraction of screen height),
    // to balance the hint text underneath.
    offsetY: 0.04,
    // Extra gap between letters and between the two rows, in letter sizes.
    letterSpacing: 0.1,
    rowGap: 0.3,
  },

  // While waiting for the tap, each letter gently "breathes" in its outline.
  // Purely visual (no physics). Every letter gets its own rhythm.
  idle: {
    speed: 1.1, // breaths per ~6 seconds; higher = livelier
    scale: 0.025, // how much it swells and shrinks (0.025 = 2.5%)
    tilt: 0.035, // how far it rocks side to side, in radians (~2 degrees)
    bob: 0.025, // how far it floats up and down, in letter sizes
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
    // Safety net: go to the gallery after this many seconds even if a letter
    // somehow never left the screen.
    maxDuration: 4,
  },

  // The camera following the letters down, from the tap to the gallery.
  dive: {
    // Seconds from the tap to the gallery. The gallery opens at this point,
    // or as soon as the last letter is out if that takes longer.
    duration: 1.6,
    // Seconds after the tap before the camera starts moving.
    cameraDelay: 0.08,
    // How far the camera has moved down at `duration`, in screen heights.
    distance: 0.5,
    // Camera easing: 1 = constant speed; higher = slower start, then a harder
    // acceleration (2 = like falling).
    easePower: 2.2,
    // The background goes from `from` to `to`: a soft band of the new color
    // rises from the bottom of the screen until it fills it at `duration`.
    colors: { from: landingBackground, to: galleryBackground },
    // Height of that soft band, as a fraction of the screen height.
    bandSoftness: 0.35,
  },

  // The way to the next page.
  transition: {
    href: "/galerie",
    // The gallery's background: the dive (and the fade) end on exactly it.
    color: galleryBackground,
    // prefers-reduced-motion only: no dive, just a fade of this many seconds.
    fadeDuration: 0.6,
  },

  // The gallery's content slides in from below, continuing the dive's motion.
  galleryEnter: {
    distance: "30vh", // where it starts, below its place (CSS length)
    duration: 0.4, // seconds
    easing: "cubic-bezier(0.16, 1, 0.3, 1)", // fast start, soft landing
  },

  // The small texts over the scene.
  hint: {
    touch: "atinge oriunde",
    mouse: "click oriunde",
    skip: "intră →",
    color: "#7a66c2",
    // Gap between the outlines and the hint, as a fraction of the screen height.
    gap: 0.05,
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
