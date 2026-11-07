"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type SyntheticEvent } from "react";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { getStickere, pretCategorie, type CategorieSticker, type Sticker } from "@/lib/catalog";
import { u } from "./albumUnits";
import { scatterSpots, type Spot } from "./stickerScatter";
import { StickerCard } from "./StickerCard";

const bags = theme.album.stickerBags;
const open = bags.open;
const texts = content.album.pungi;
// A press that moved more than this (screen px) was not a tap (the album's
// own measure: a swipe that started on a sticker turns the page instead).
const TAP_SLOP = theme.album.swipeThreshold.tapSlop;

// Lengths in the reference's px (docs/pungi-stickere-referinta.html, a
// 340px page) as CSS: in u, so they follow the page's size.
const r = (px: number) => u(px * bags.refScale);
// "0 6u 12u ..." with every "Nu" in the reference's px (see r).
const rCss = (value: string) => value.replace(/([\d.]+)u\b/g, (_, n) => r(Number(n)));

// Taps here are this page's own: they never turn the album's page. The
// bags and stickers have touch-action: manipulation (no waiting for a
// double tap: the tap counts at once on a phone).
const keep = (e: SyntheticEvent) => e.stopPropagation();
const keepAll = (e: SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const ORDER: CategorieSticker[] = ["normale", "holografice"];

// What the page is doing (one bag at a time, `opened`):
//   closed      both bags in their places, wiggling now and then
//   pouring     the bag opens and pours; its stickers wait in its mouth
//   out         the stickers fly out and land, spread on the page
//   settled     all landed; the small bag in the corner shakes once: a tap
//               on it puts them back
//   collecting  they fly back into it, the last one first
//   returning   both bags go back to their places (as the last one goes in)
type Phase = "closed" | "pouring" | "out" | "settled" | "collecting" | "returning";

// A bag's turn in its place, and small in the corner (see open.park).
const baseOf = (c: CategorieSticker) => `rotate(${bags.bags[c].rotation}deg)`;
function parkOf(c: CategorieSticker) {
  const p = open.park[c];
  return `translate(${r(p.x)}, ${r(p.y)}) scale(${p.scale}) rotate(${p.rotation}deg)`;
}
// Its mouth: the middle of its top (page px), in its place, or small in
// the corner (parked: moved, scaled and turned around its middle).
const MOUTH_DOWN = 8; // px below the bag's top edge
function mouthOf(c: CategorieSticker, parked = false) {
  const b = bags.bags[c];
  const middle = { x: b.left + bags.size.width / 2, y: b.top + bags.size.height / 2 };
  if (!parked) return { x: middle.x, y: b.top + MOUTH_DOWN };
  const p = open.park[c];
  const d = (bags.size.height / 2 - MOUTH_DOWN) * p.scale; // middle to mouth
  const a = (p.rotation * Math.PI) / 180;
  return { x: middle.x + p.x + d * Math.sin(a), y: middle.y + p.y - d * Math.cos(a) };
}

// The stickers' page: two closed ziploc bags, "normale" and "holografice",
// the first stickers of each showing through the plastic, over two
// ornaments. A tap on one opens it: it pours its stickers out over the page
// and lands small in the corner, the other one fades; a tap on the small
// bag puts them back. Timings and curves as in the reference. Only
// transform and opacity move; no filter, backdrop-filter or blend mode (the
// page is in 3D: Safari). Leaving the page (live false) closes everything
// at once.
//
// All the stickers of both bags are on the page from the start, unseen in
// their bag's mouth, and decoded while the page is shown: a tap only
// changes their styles (no new elements, no download, no decoding then),
// so the bag moves at once.
export function StickerBags({ live }: { live: boolean }) {
  const [opened, setOpened] = useState<CategorieSticker | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  // The sticker shown on its card.
  const [focus, setFocus] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const layer = useRef<HTMLDivElement>(null);
  const later = (seconds: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, seconds * 1000));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // Off the page: closed again, at once (React's way of resetting state
  // when a prop changes: during the render, not in an effect).
  const [wasLive, setWasLive] = useState(live);
  if (live !== wasLive) {
    setWasLive(live);
    if (!live) {
      setOpened(null);
      setPhase("closed");
      setFocus(null);
    }
  }
  // ...the pending steps of an animation forgotten; and on the page, the
  // stickers' pictures decoded now (decode(): ready to be drawn, so their
  // first frame on the move costs nothing).
  useEffect(() => {
    if (!live) return clearTimers();
    layer.current?.querySelectorAll("img").forEach((img) => img.decode().catch(() => {}));
  }, [live]);
  useEffect(() => clearTimers, []);

  const stickere = useMemo(
    () => Object.fromEntries(ORDER.map((c) => [c, getStickere(c)])) as Record<CategorieSticker, Sticker[]>,
    [],
  );

  const openBag = (c: CategorieSticker) => {
    if (phase !== "closed" || !stickere[c].length) return;
    const n = stickere[c].length;
    setOpened(c);
    setPhase("pouring");
    later(open.flyAfter, () => setPhase("out"));
    // The last one leaves (n - 1) staggers after the first, then flies.
    later(open.flyAfter + (n - 1) * open.fly.stagger + open.fly.duration, () => setPhase("settled"));
  };

  const collect = () => {
    if (phase !== "settled" || !opened) return;
    const n = stickere[opened].length;
    setPhase("collecting");
    const inBag = (n - 1) * open.collect.stagger + open.fly.duration;
    later(inBag, () => setPhase("returning"));
    later(inBag + open.back.duration, () => {
      setOpened(null);
      setPhase("closed");
    });
  };

  // A tap on the page's edge (MatAlbum asks first, see "album:edge-tap")
  // while a bag is open: the stickers go back into it, the page stays.
  // Swipes, the tabs and the arrow keys still turn the page (leaving it
  // closes the bags).
  const collectLatest = useRef(collect);
  useEffect(() => {
    collectLatest.current = collect;
  });
  const isOpen = opened !== null && phase !== "closed" && phase !== "returning";
  useEffect(() => {
    if (!live || !isOpen) return;
    const onEdge = (e: Event) => {
      e.preventDefault();
      collectLatest.current();
    };
    window.addEventListener("album:edge-tap", onEdge);
    return () => window.removeEventListener("album:edge-tap", onEdge);
  }, [live, isOpen]);

  const closeCard = useCallback(() => setFocus(null), []);

  const modeOf = (c: CategorieSticker): Mode => {
    if (opened === null || phase === "closed") return "idle";
    if (opened !== c) return phase === "returning" ? "idle-back" : "gone";
    if (phase === "pouring" || phase === "out") return "pour";
    if (phase === "settled" || phase === "collecting") return "parked";
    return "back";
  };

  return (
    <>
      <Ornaments />
      {ORDER.map((c, i) => (
        <Bag
          key={c}
          categorie={c}
          stickere={stickere[c]}
          live={live}
          delay={i * bags.wiggle.delay}
          mode={modeOf(c)}
          onTap={() => (opened === c ? collect() : openBag(c))}
        />
      ))}
      <div ref={layer} className="pointer-events-none absolute inset-0" style={{ zIndex: 50 }}>
        {ORDER.map((c) => (
          <Spread
            key={c}
            categorie={c}
            stickere={stickere[c]}
            state={
              opened !== c || phase === "closed" || phase === "returning"
                ? "hidden"
                : phase === "pouring"
                  ? "waiting"
                  : phase === "collecting"
                    ? "back"
                    : phase === "settled"
                      ? "settled"
                      : "out"
            }
            onTap={setFocus}
          />
        ))}
      </div>
      {opened && focus && (
        <StickerCard
          sticker={stickere[opened].find((s) => s.id === focus) ?? stickere[opened][0]}
          categorie={opened}
          onClose={closeCard}
        />
      )}
    </>
  );
}

// The two ornaments, under everything on the page and never tapped: the
// picture as a mask, filled with the theme's color (see bags.ornament).
const Ornaments = memo(function Ornaments() {
  const o = bags.ornament;
  const look: CSSProperties = {
    height: o.pageHeight,
    aspectRatio: `${o.width} / ${o.height}`,
    background: o.color,
    opacity: o.opacity,
    WebkitMaskImage: `url(${o.src})`,
    maskImage: `url(${o.src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute top-0" style={{ ...look, right: u(-o.overhang) }} />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0" style={{ ...look, rotate: "180deg" }} />
    </>
  );
});

// How a bag looks at the moment:
//   idle       in its place (wiggling)
//   idle-back  the other bag coming back (fading in, then wiggling)
//   gone       faded out while the other is open
//   pour       opened: tips over, pours, lands small in the corner
//   parked     small in the corner, its stickers out: shakes once (it can
//              be tapped), then waits there while they fly back in
//   back       going back to its place, closing
// One CSS animation after the other (pour, nudge, back), each starting
// where the one before ended: no jump and no pause between them.
type Mode = "idle" | "idle-back" | "gone" | "pour" | "parked" | "back";

type BagProps = {
  categorie: CategorieSticker;
  stickere: Sticker[];
  live: boolean;
  delay: number;
  mode: Mode;
  onTap: () => void;
};

function Bag({ categorie, stickere, live, delay, mode, onTap }: BagProps) {
  const place = bags.bags[categorie];
  const { body, zip, pull, label, inside } = bags;
  const shown = stickere.slice(0, inside.slots.length);
  const slots = slotsFor(shown.length);
  const holo = categorie === "holografice";
  const isOpen = mode === "pour" || mode === "parked";
  // Small in the corner, its stickers out: a tap puts them back.
  const collects = mode === "parked";
  const base = baseOf(categorie);
  const { first, second, grow } = open.pour;

  // Its movement: wiggling in its place, pouring (CSS keyframes, so the
  // easing applies to each step as in the reference), shaking once in the
  // corner, going back.
  const motion: CSSProperties =
    mode === "pour"
      ? { animation: `bag-pour ${open.pour.duration}s ${open.pour.easing} forwards` }
      : mode === "parked"
        ? // Over the stickers (their layer is at 50): one dropped on it
          // slides under, the bag can always be tapped.
          { animation: `bag-nudge ${open.nudge}s ease-in-out forwards`, zIndex: 60 }
        : mode === "back"
          ? { animation: `bag-back ${open.back.duration}s ${open.back.easing} forwards` }
          : mode === "gone"
            ? { opacity: 0, pointerEvents: "none", transition: `opacity ${open.other}s` }
            : mode === "idle-back"
              ? { transition: `opacity ${open.other}s` }
              : { animation: `bag-wiggle ${bags.wiggle.period}s ease-in-out ${delay}s infinite` };

  return (
    <button
      type="button"
      aria-label={collects ? texts.strange(texts[categorie]) : texts.deschide(texts[categorie])}
      aria-expanded={isOpen}
      disabled={!live}
      onPointerDown={keep}
      onClick={(e) => {
        keepAll(e);
        onTap();
      }}
      className="absolute cursor-pointer touch-manipulation border-0 bg-transparent p-0"
      style={
        {
          left: r(place.left),
          top: r(place.top),
          width: r(bags.size.width),
          height: r(bags.size.height),
          "--base": base,
          "--pour-a": `${base} translateY(${r(-first.lift)}) rotate(${first.turn}deg) scale(${grow})`,
          "--pour-b": `${base} translateY(${r(-second.lift)}) rotate(${second.turn}deg) scale(${grow})`,
          "--park": parkOf(categorie),
          transform: "var(--base)",
          ...motion,
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: body.radius, background: body.background, boxShadow: rCss(body.shadow) }}
      >
        {/* The stickers, through the plastic (their names only as alt);
            gone while it is open (they are out on the page). */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: r(inside.top), opacity: isOpen ? 0 : 1, transition: `opacity ${open.insideFade}s` }}
        >
          {shown.map((s, k) => {
            const slot = slots[k];
            const [w, h] = fit(s, inside.sticker);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                src={s.imagine}
                alt={s.nume}
                width={s.latime}
                height={s.inaltime}
                loading="eager"
                draggable={false}
                className="art absolute"
                style={{
                  left: r(slot.x - w / 2),
                  top: r(slot.y - h / 2),
                  width: r(w),
                  height: r(h),
                  maxWidth: "none",
                  opacity: inside.opacity,
                  rotate: `${slot.rotation}deg`,
                }}
              />
            );
          })}
        </div>
        {/* The light's streak on the plastic, over the stickers. */}
        <div
          aria-hidden
          className="absolute"
          style={{
            left: body.reflex.left,
            top: body.reflex.top,
            width: body.reflex.width,
            height: body.reflex.height,
            background: body.reflex.background,
            transform: `skewX(${body.reflex.skew}deg)`,
          }}
        />
        {/* The zipper: white, a coral stripe under it, its slider on the
            left (slid right while it is open). */}
        <div
          aria-hidden
          className="absolute inset-x-0"
          style={{ top: r(zip.top), height: r(zip.height), background: zip.background, boxShadow: rCss(zip.shadow) }}
        >
          <div
            className="absolute inset-x-0"
            style={{ top: r(zip.stripe.top), height: r(zip.stripe.height), background: zip.stripe.color }}
          />
        </div>
        <div
          aria-hidden
          className="absolute"
          style={{
            left: r(pull.left),
            top: r(pull.top),
            width: r(pull.width),
            height: r(pull.height),
            borderRadius: r(pull.radius),
            background: pull.color,
            boxShadow: rCss(pull.shadow),
            translate: isOpen ? `${r(open.pull.shift)} 0` : "0 0",
            transition: `translate ${open.pull.duration}s ${open.pull.easing}`,
          }}
        />
        {/* The label: its category, and the price of one (or "în curând"). */}
        <div
          aria-hidden
          className="absolute flex flex-col items-center justify-center"
          style={{
            left: r(label.side),
            right: r(label.side),
            top: r(label.top),
            height: r(label.height),
            borderRadius: r(label.radius),
            background: holo ? label.holoBackground : label.background,
            color: label.color,
            boxShadow: rCss(label.shadow),
          }}
        >
          <span style={{ fontSize: r(label.titleSize), lineHeight: 1 }}>{texts[categorie]}</span>
          <span
            style={{
              marginTop: r(label.priceGap),
              fontFamily: "var(--font-hanken), sans-serif",
              fontSize: r(label.priceSize),
              letterSpacing: label.priceSpacing,
              opacity: label.priceOpacity,
              lineHeight: 1.2,
            }}
          >
            {stickere.length ? texts.pret(pretCategorie[categorie]) : texts.inCurand}
          </span>
        </div>
      </div>
    </button>
  );
}

// Where the stickers seen through a bag's plastic lie: with 6 or more (only
// the first 6 show), its slots; with fewer, centred so the bag never looks
// lopsided: one row for 1-3, two rows (3, then the rest) for 4-5, each row
// centred across the bag, the rows in the middle of the lower part.
function slotsFor(n: number) {
  const { slots, rowGap, middle } = bags.inside;
  if (n >= slots.length) return slots;
  const rows = n <= 3 ? [n] : [3, n - 3];
  const step = slots[1].x - slots[0].x; // as far apart as in the slots
  const centre = bags.size.width / 2;
  const out: { x: number; y: number; rotation: number }[] = [];
  rows.forEach((count, row) => {
    const y = middle + (row - (rows.length - 1) / 2) * rowGap;
    for (let j = 0; j < count; j++) {
      out.push({ x: centre + (j - (count - 1) / 2) * step, y, rotation: slots[out.length].rotation });
    }
  });
  return out;
}

// A sticker's picture fitted in a square of `side` px (its proportions
// kept): its width and height.
function fit(s: Sticker, side: number): [number, number] {
  return s.latime >= s.inaltime ? [side, (side * s.inaltime) / s.latime] : [(side * s.latime) / s.inaltime, side];
}

// Where a bag's stickers are:
//   hidden   unseen in its mouth, in its place (no movement: ready)
//   waiting  the bag is pouring: still in its mouth
//   out      flying out, one after the other, and landing
//   settled  all landed, in their grid: a tap opens one's card (they never
//            move under the finger)
//   back     flying back into the small bag, the last one first
type SpreadState = "hidden" | "waiting" | "out" | "settled" | "back";

type SpreadProps = {
  categorie: CategorieSticker;
  stickere: Sticker[];
  state: SpreadState;
  onTap: (id: string) => void;
};

// A bag's stickers on the page: from its mouth to their spots (one after
// the other), and back into it, small in the corner. Moved with translate /
// rotate / scale (the path with a little overshoot, the turn and size
// without). Each shows only as its own flight starts (with its delay) and,
// going back, hides only as it reaches the bag: never still in the mouth.
// Always there (see StickerBags), unseen and still while hidden; drawn
// again only when its state changes (memo).
//
// A tap on one (all landed) opens its card. A tap on it is never the
// page's edge (data-no-edge-tap, see MatAlbum), but a swipe that starts on
// it still turns the page: so the press is not stopped here, and a "click"
// after a press that moved (a mouse swipe) is not a tap.
const Spread = memo(function Spread({ categorie, stickere, state, onTap }: SpreadProps) {
  const spots = useMemo(() => scatterSpots(stickere.length), [stickere.length]);
  const back = state === "back";
  const atMouth = state !== "out" && state !== "settled";
  const settled = state === "settled";
  const shown = state === "out" || settled;
  const mouth = mouthOf(categorie, back);
  const { fly } = open;
  const n = stickere.length;
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  return (
    <>
      {stickere.map((s, i) => {
        const spot: Spot = spots[i];
        const [w, h] = fit(s, spot.size);
        const at = atMouth ? mouth : spot;
        const delay = back ? (n - 1 - i) * open.collect.stagger : i * fly.stagger;
        const turn = atMouth ? fly.startRotations[i % fly.startRotations.length] : spot.rotation;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.id}
            src={s.imagine}
            alt={shown ? s.nume : ""}
            aria-hidden={!shown}
            data-no-edge-tap=""
            width={s.latime}
            height={s.inaltime}
            loading="eager"
            decoding="async"
            draggable={false}
            onPointerDown={(e: PointerEvent<HTMLImageElement>) => (pressedAt.current = { x: e.clientX, y: e.clientY })}
            onClick={(e) => {
              keepAll(e);
              const p = pressedAt.current;
              const still = !p || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= TAP_SLOP;
              if (settled && still) onTap(s.id);
            }}
            className="art absolute left-0 top-0 touch-manipulation"
            style={{
              width: r(w),
              height: r(h),
              maxWidth: "none",
              pointerEvents: shown ? "auto" : "none",
              cursor: settled ? "pointer" : undefined,
              translate: `${r(at.x - w / 2)} ${r(at.y - h / 2)}`,
              rotate: `${turn}deg`,
              scale: atMouth ? `${fly.startScale}` : "1",
              opacity: atMouth ? 0 : 1,
              zIndex: 10 + i,
              transition:
                state === "hidden" || settled
                  ? "none"
                  : [
                      `translate ${fly.duration}s ${fly.move} ${delay}s`,
                      `rotate ${fly.duration}s ${fly.turn} ${delay}s`,
                      `scale ${fly.duration}s ${fly.turn} ${delay}s`,
                      // Seen only while it flies: shows as its flight starts
                      // (same delay), hides as it reaches the bag.
                      `opacity ${fly.fade}s linear ${back ? delay + fly.duration - fly.hideEarly - fly.fade : delay}s`,
                    ].join(", "),
            }}
          />
        );
      })}
    </>
  );
});
