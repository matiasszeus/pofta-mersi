"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { createPortal, flushSync } from "react-dom";
import { textFonts } from "@/app/fonts";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { NOTE_PIVOT, type Placed } from "./objectLayout";
import { hideIfBroken, hideOnError } from "@/lib/mediaError";

const note = theme.atelier.note;
const rad = (deg: number) => (deg * Math.PI) / 180;

// The point of the note on the mat it turns around (and lifts its corner
// from): near the tape. Shared by the CSS, the lift-off maths and the
// letters' check against the note.
const PIVOT = NOTE_PIVOT;

// "#1D2633", 0.4 -> "rgb(29 38 51 / 0.4)"
function rgba(hex: string, opacity: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${opacity})`;
}


// Sizes shared by the note on the mat and the opened one. On the mat the
// sheet is laid out at the note's own width; opened, at its opened width,
// and while it travels between the two it is scaled by --note-k (the mat
// width / the opened width, set by matTransform).
const sheetVars = {
  "--note-open-w": `${note.open.width}px`,
  "--note-open-w-large": `${note.open.widthLarge}px`,
  "--ring-w": `${note.focusRing.width}px`,
  "--ring-c": note.focusRing.color,
} as CSSProperties;

// Makes the text as big as configured, or smaller if it would not fit its
// area (never under minSize). Sizes are in "cqw": % of the sheet's width, so
// the result is the same at any size of the sheet.
function fitText(area: HTMLElement) {
  const text = area.firstElementChild as HTMLElement;
  let size = note.text.size;
  text.style.fontSize = `${size}cqw`;
  while (text.scrollHeight > area.clientHeight && size > note.text.minSize) {
    size -= 0.1;
    text.style.fontSize = `${size}cqw`;
  }
}

const paperSizes = `(min-width: 768px) ${note.open.widthLarge}px, ${note.open.width}px`;

// One picture of the paper filling the sheet.
function Paper({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <Image onError={hideOnError} ref={hideIfBroken}
      src={src}
      alt=""
      fill
      priority
      sizes={paperSizes}
      draggable={false}
      className={`art pointer-events-none ${className ?? ""}`}
      style={style}
    />
  );
}

function Tape() {
  return (
    <span
      aria-hidden
      className="absolute -top-[3%] left-1/2 h-[8%] w-[44%] -translate-x-1/2 -rotate-3"
      style={{ background: note.tape, opacity: note.tapeOpacity }}
    />
  );
}

type DivRef = React.Ref<HTMLDivElement>;
type NoteSheetProps = {
  opened?: boolean;
  // The layers the opened sheet animates.
  restShadowRef?: DivRef;
  openShadowRef?: DivRef;
  inkRef?: DivRef;
  textRef?: DivRef;
};

// The text area (theme.ts textArea, in % of the picture) as CSS.
const areaStyle = (() => {
  const { top, right, bottom, left } = note.textArea;
  return { top: `${top}%`, right: `${right}%`, bottom: `${bottom}%`, left: `${left}%` };
})();
const areaWidth = (100 - note.textArea.left - note.textArea.right) / 100;
const inkSizes = `(min-width: 768px) ${Math.round(note.open.widthLarge * areaWidth)}px, ${Math.round(note.open.width * areaWidth)}px`;

// The sheet, laid out at its opened size, as stacked layers:
//   rest shadow  small and tight, as on the mat
//   open shadow  big and soft                       (opened sheet only)
//   paper        the blank sheet and the tape: never changes
//   ink          the scribbles, in the text area
//   text         the real text, in the same area    (opened sheet only)
// Shadows are dark blurred copies of the paper, so they follow the torn
// edge; their blur is fixed. Lifting the note only changes these layers'
// opacity while the sheet moves (transform): the scribbles fade out, the
// text fades in, the shadow grows softer.
function NoteSheet({ opened = false, restShadowRef, openShadowRef, inkRef, textRef }: NoteSheetProps) {
  const area = useRef<HTMLDivElement>(null);
  const rest = note.shadow;
  const open = note.open.shadow;

  // Fit once laid out, and again once the font has loaded (other widths).
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    fitText(el);
    document.fonts.ready.then(() => fitText(el));
  }, []);

  return (
    <div
      // container-type: the text's "cqw" sizes are measured on this sheet.
      // On the mat it fills the note's box; opened, the opened width.
      className={`relative [container-type:inline-size] ${opened ? "w-(--note-open-w) md:w-(--note-open-w-large)" : "w-full"}`}
      style={{ aspectRatio: `${note.paper.width} / ${note.paper.height}`, color: note.ink }}
    >
      {/* Shadow on the mat: offset and blur divided by --note-k (1 on the
          mat), so they look the same while the opened sheet is scaled down
          to the mat's size. */}
      <div
        ref={restShadowRef}
        className="absolute inset-0"
        style={{
          translate: `calc(${rest.x}px / var(--note-k)) calc(${rest.y}px / var(--note-k))`,
          opacity: rest.opacity,
        }}
      >
        <Paper src={note.paper.src} style={{ filter: `brightness(0) blur(calc(${rest.blur}px / var(--note-k)))` }} />
      </div>
      {opened && (
        <div
          ref={openShadowRef}
          className="absolute inset-0"
          style={{ translate: `${open.x}px ${open.y}px`, opacity: open.opacity }}
        >
          <Paper src={note.paper.src} style={{ filter: `brightness(0) blur(${open.blur}px)` }} />
        </div>
      )}
      <div className="note-face absolute inset-0">
        <Paper src={note.paper.src} />
        <Tape />
        {/* The scribbles: as wide as the text area, from its top-left. */}
        <div ref={inkRef} className="absolute" style={areaStyle}>
          <Image onError={hideOnError} ref={hideIfBroken}
            src={note.scribbles.src}
            alt=""
            fill
            priority
            sizes={inkSizes}
            draggable={false}
            className="art pointer-events-none object-contain object-left-top"
          />
        </div>
      </div>
      {opened && (
        <div ref={area} className="absolute overflow-hidden" style={areaStyle}>
          <div
            ref={textRef}
            // The site's text font (Whitenice), from the page.
            className="space-y-[0.6em] text-left [overflow-wrap:anywhere]"
            // Always there (laid out, font loaded), only invisible until the
            // note is opened.
            style={{ lineHeight: note.text.lineHeight, opacity: 0 }}
          >
            {content.atelierNote.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type AtelierNoteProps = {
  // Seconds from now until the album hits the mat, when the note's corner
  // lifts; null = no flutter (no slam, or reduced motion).
  flutterDelay: number | null;
  // Its place and turn on the mat (see matLayout); null = not known yet
  // (on the server): hidden until then.
  place: Placed | null;
};

type Input = "keyboard" | "pointer";

// The handwritten note on the atelier mat. A button on the mat; tapped, the
// note is lifted off the mat and shown big in a dialog over the atelier.
// Closes with a tap outside the paper, Esc, or the phone's back button,
// always going back onto the mat exactly where it was.
//
// The dialog is our own (role="dialog"), not the browser's <dialog>: browsers
// may close a native modal dialog on Esc or on Android's back button at once,
// without letting the page animate it back.
export function AtelierNote({ flutterDelay, place }: AtelierNoteProps) {
  const reducedMotion = useReducedMotion();
  const rotation = place?.rotation ?? 0;
  const button = useRef<HTMLButtonElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null); // position, turn, size
  const tilter = useRef<HTMLDivElement>(null); // the 3D tilt while in the hand
  const restShadow = useRef<HTMLDivElement>(null);
  const openShadow = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  // The dialog (put straight into <body>) is always in the page, so its
  // pictures and text are loaded and laid out before the first tap; it is
  // only hidden while closed.
  const [shown, setShown] = useState(false);
  // While the sheet is lifted, the note on the mat is hidden: it looks as if
  // the paper itself was picked up.
  const [lifted, setLifted] = useState(false);
  const isOpen = useRef(false);
  const closing = useRef(false);
  // Our own history entry is being removed by us (after closing with Esc or
  // a tap): the resulting "back" must not be treated as a close request.
  const ignoreNextPop = useRef(false);
  // true in the browser, false on the server (and while hydrating): the
  // dialog can only be put into <body> in the browser.
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Settles once the font has loaded and the sheet's pictures are decoded,
  // or failed to: it never rejects.
  const ready = useRef<Promise<unknown>>(Promise.resolve());

  // On entering the atelier: load the text's font and decode the opened
  // sheet's pictures now, so a tap finds everything ready. Only a nicety:
  // any failure (e.g. "NetworkError" from the font in some in-app browsers)
  // is swallowed, and opening never depends on it.
  useEffect(() => {
    if (!inBrowser) return;
    const quietly = (load: () => Promise<unknown>) => {
      try {
        return load().catch(() => {});
      } catch {
        return Promise.resolve(); // threw before even returning a promise
      }
    };
    // Exactly the fonts this text needs (Whitenice, and Hanken Grotesk for
    // any character Whitenice lacks).
    const font = quietly(() => document.fonts.load(`1em ${textFonts}`, content.atelierNote.join(" ")));
    const pictures = [...(mover.current?.querySelectorAll("img") ?? [])].map((img) => quietly(() => img.decode()));
    ready.current = Promise.allSettled([font, ...pictures]);
  }, [inBrowser]);

  // Where the note lies on the mat, as a transform of the opened sheet
  // (which turns around its middle). Worked out from the note's layout box,
  // not from its on-screen rectangle (which, turned, is bigger): the box,
  // turned by `rotation` around PIVOT, scaled from the opened size.
  const matTransform = () => {
    const box = button.current!.getBoundingClientRect(); // the button itself is not turned
    const area = stage.current!.getBoundingClientRect(); // the opened sheet sits in its middle
    const scale = box.width / mover.current!.offsetWidth;
    mover.current!.style.setProperty("--note-k", String(scale));
    const px = box.left + PIVOT.x * box.width;
    const py = box.top + PIVOT.y * box.height;
    const cx = box.left + box.width / 2 - px;
    const cy = box.top + box.height / 2 - py;
    // Its turn on the mat, as set on the button (read there, so this is
    // always the current one).
    const turn = parseFloat(button.current!.style.getPropertyValue("--note-rotation")) || 0;
    const a = rad(turn);
    const midX = px + cx * Math.cos(a) - cy * Math.sin(a);
    const midY = py + cx * Math.sin(a) + cy * Math.cos(a);
    const dx = midX - (area.left + area.width / 2);
    const dy = midY - (area.top + area.height / 2);
    return `translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${scale})`;
  };
  const openTransform = `translate(0px, 0px) rotate(${note.open.rotation}deg) scale(1)`;
  const tiltTransform = (deg: number) => `perspective(900px) rotateX(${deg}deg)`;

  // While open, the rest of the page can be neither reached nor scrolled:
  // `inert` takes it away from the keyboard, screen readers and taps.
  const setPageInert = (inert: boolean) => {
    const page = button.current?.closest("main");
    if (page) page.inert = inert;
    document.documentElement.style.overflow = inert ? "hidden" : "";
  };

  // All the moving parts, with the value each one has when opened.
  const parts = () => ({
    backdrop: backdrop.current!,
    mover: mover.current!,
    tilter: tilter.current!,
    restShadow: restShadow.current!,
    openShadow: openShadow.current!,
    ink: ink.current!,
    text: text.current!,
  });

  // Runs one animation, telling the browser beforehand what will change.
  const run = (el: HTMLElement, frames: Keyframe[], duration: number, easing: string) => {
    el.getAnimations().forEach((a) => a.cancel());
    el.style.willChange = "transform, opacity";
    const anim = el.animate(frames, { duration: duration * 1000, easing, fill: "forwards" });
    anim.finished.then(() => (el.style.willChange = ""), () => {});
    return anim;
  };

  const open = async () => {
    if (isOpen.current) return;
    isOpen.current = true;
    closing.current = false;
    // Normally already done; if not (a tap the moment the page appears),
    // wait a moment for the font and pictures, rather than showing a
    // stand-in font that then changes. Never longer than readyTimeout, and
    // whatever happens to the loading, the note opens.
    const timeout = new Promise((done) => setTimeout(done, note.open.readyTimeout * 1000));
    try {
      await Promise.race([ready.current, timeout]);
    } catch {
      // ignore: open anyway
    }
    if (!isOpen.current) return;
    // Put the dialog in the page now (not on React's next render), so it can
    // be measured and animated right away.
    flushSync(() => setShown(true));
    setPageInert(true);
    // A history entry of our own, so the phone's back button closes the note
    // instead of leaving the atelier. (Next.js keeps working with entries
    // added like this, as long as its own state is kept.)
    history.pushState({ ...history.state, atelierNote: true }, "");

    const p = parts();
    const { duration: d, easing } = note.open;
    const restOpacity = note.shadow.opacity;
    const openOpacity = note.open.shadow.opacity;
    mover.current!.focus({ preventScroll: true });
    run(p.backdrop, [{ opacity: 0 }, { opacity: 1 }], d, easing);
    if (reducedMotion) {
      // Only a fade, straight to the opened sheet.
      run(p.mover, [{ opacity: 0 }, { opacity: 1 }], d, easing);
      for (const [el, to] of [[p.restShadow, 0], [p.openShadow, openOpacity], [p.ink, 0], [p.text, 1]] as const) {
        run(el, [{ opacity: to }, { opacity: to }], 0, "linear");
      }
      return;
    }
    // Lifted from where it lies: moves, turns and grows to the middle,
    // tilting in the hand on the way; the writing on the mat fades into the
    // clean sheet, the text appears halfway, the shadow grows softer.
    run(p.mover, [{ transform: matTransform() }, { transform: openTransform }], d, easing);
    run(p.tilter, [{ transform: tiltTransform(0) }, { transform: tiltTransform(note.open.tilt), offset: 0.4 }, { transform: tiltTransform(0) }], d, "ease-in-out");
    run(p.restShadow, [{ opacity: restOpacity }, { opacity: 0 }], d, easing);
    run(p.openShadow, [{ opacity: 0 }, { opacity: openOpacity }], d, easing);
    // The paper stays as it is; the scribbles fade out early, the text fades
    // in a little later (the two overlap), so one turns into the other.
    const [inkStart, inkEnd] = note.open.inkOut;
    const [textStart, textEnd] = note.open.textIn;
    run(p.ink, [{ opacity: 1 }, { opacity: 1, offset: inkStart }, { opacity: 0, offset: inkEnd }, { opacity: 0 }], d, "linear");
    run(
      p.text,
      [{ opacity: 0 }, { opacity: 0, offset: textStart }, { opacity: 1, offset: textEnd }, { opacity: 1 }],
      d,
      "linear",
    );
    setLifted(true);
  };

  // Put the note back. Starts from wherever everything is right now, so it
  // also works in the middle of opening (a quick tap right after opening).
  // fromBack = the back button was used (our history entry is already gone).
  const close = useCallback(
    (input: Input, fromBack = false) => {
      if (!isOpen.current || closing.current) return;
      closing.current = true;
      const p = parts();
      const { closeDuration: d, easing } = note.open;
      const now = (el: HTMLElement, prop: "transform" | "opacity") => getComputedStyle(el)[prop];
      const out = run(p.backdrop, [{ opacity: now(p.backdrop, "opacity") }, { opacity: 0 }], d, easing);
      if (reducedMotion) {
        run(p.mover, [{ opacity: now(p.mover, "opacity") }, { opacity: 0 }], d, easing);
      } else {
        const restOpacity = note.shadow.opacity;
        run(p.mover, [{ transform: now(p.mover, "transform") }, { transform: matTransform() }], d, easing);
        // Tilts in the hand, then settles flat with a tiny tilt the other way.
        run(
          p.tilter,
          [
            { transform: now(p.tilter, "transform") },
            { transform: tiltTransform(note.open.tilt), offset: 0.45 },
            { transform: tiltTransform(note.open.settle), offset: 0.85 },
            { transform: tiltTransform(0) },
          ],
          d,
          "ease-in-out",
        );
        run(p.restShadow, [{ opacity: now(p.restShadow, "opacity") }, { opacity: restOpacity }], d, easing);
        run(p.openShadow, [{ opacity: now(p.openShadow, "opacity") }, { opacity: 0 }], d, easing);
        // The opening backwards: the text fades out, then the scribbles come
        // back (from wherever they are, if the opening was interrupted).
        const [inkStart, inkEnd] = note.open.inkOut;
        const [textStart, textEnd] = note.open.textIn;
        const textNow = now(p.text, "opacity");
        const inkNow = now(p.ink, "opacity");
        run(
          p.text,
          [{ opacity: textNow }, { opacity: textNow, offset: 1 - textEnd }, { opacity: 0, offset: 1 - textStart }, { opacity: 0 }],
          d,
          "linear",
        );
        run(
          p.ink,
          [{ opacity: inkNow }, { opacity: inkNow, offset: 1 - inkEnd }, { opacity: 1, offset: 1 - inkStart }, { opacity: 1 }],
          d,
          "linear",
        );
      }
      out.finished.then(
        () => {
          // In this very frame: the sheet (now exactly where the note lies)
          // goes, the note on the mat comes back. Not on React's next render,
          // so there is never a frame with both or neither.
          setPageInert(false);
          flushSync(() => {
            setLifted(false);
            setShown(false);
          });
          isOpen.current = false;
          closing.current = false;
          // Focus back on the note. After a tap or click, without the focus
          // outline (it is only for people using the keyboard).
          const b = button.current;
          if (b) {
            if (input === "pointer") {
              b.dataset.pointerFocus = "";
              const clear = () => delete b.dataset.pointerFocus;
              b.addEventListener("blur", clear, { once: true });
              window.addEventListener("keydown", clear, { once: true });
            }
            b.focus({ preventScroll: true, focusVisible: input === "keyboard" } as FocusOptions);
          }
          if (!fromBack) {
            ignoreNextPop.current = true;
            history.back();
          }
        },
        () => {},
      );
    },
    [reducedMotion],
  );

  // The back button while the note is open: close it, stay in the atelier.
  // Esc closes it too.
  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (isOpen.current) close("pointer", true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen.current) close("keyboard");
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  // Leaving the page with the note open: let the page scroll again.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const matVars = {
    ...sheetVars,
    "--note-w": `${place?.width ?? 0}px`,
    "--note-h": `${place?.height ?? 0}px`,
    "--note-left": `${place?.left ?? 0}px`,
    "--note-top": `${place?.top ?? 0}px`,
    "--note-rotation": `${rotation}deg`,
    "--note-pivot": `${PIVOT.x * 100}% ${PIVOT.y * 100}%`,
    "--note-flutter-lift": `${note.flutter.lift}deg`,
    "--note-flutter-duration": `${note.flutter.duration}s`,
    "--note-flutter-delay": `${flutterDelay ?? 0}s`,
    // Fades in like the mat's lines, just after them.
    "--note-appear-duration": `${theme.atelier.mat.fadeIn}s`,
    "--note-appear-delay": `${note.appearDelay}s`,
  } as CSSProperties;

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Citește notița"
        aria-haspopup="dialog"
        onClick={open}
        className={`note-button note-appear mat-dims absolute [--note-k:1] z-10 block top-(--note-top) left-(--note-left) ${lifted || !place ? "invisible" : ""}`}
        style={matVars}
      >
        <span
          className={`note-mat block h-(--note-h) w-(--note-w) ${
            flutterDelay !== null ? "note-flutter" : ""
          }`}
        >
          <NoteSheet />
        </span>
      </button>

      {inBrowser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notița"
            // Closed: in the page but invisible, untouchable, out of reach.
            aria-hidden={!shown}
            inert={!shown}
            className={`fixed inset-0 z-50 h-lvh [--note-k:1] overscroll-contain ${shown ? "" : "invisible"}`}
            style={sheetVars}
            // A tap anywhere outside the paper closes it.
            onClick={(e) => {
              if (!mover.current?.contains(e.target as Node)) close("pointer");
            }}
          >
            {/* The dimmed layer: its blur is fixed; only its opacity changes. */}
            <div
              ref={backdrop}
              className="absolute inset-0"
              style={{
                background: rgba(note.open.backdrop, note.open.backdropOpacity),
                backdropFilter: `blur(${note.open.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${note.open.backdropBlur}px)`,
              }}
            />
            <div ref={stage} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                ref={mover}
                tabIndex={-1}
                className="pointer-events-auto outline-none"
                style={{ transform: openTransform }}
              >
                <div ref={tilter}>
                  <NoteSheet
                    opened
                    restShadowRef={restShadow}
                    openShadowRef={openShadow}
                    inkRef={ink}
                    textRef={text}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
