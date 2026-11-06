"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { getStickere, pretCategorie, type CategorieSticker, type Sticker } from "@/lib/catalog";
import { u } from "./albumUnits";
import { scatterSpots, type Spot } from "./stickerScatter";

const bags = theme.album.stickerBags;
const open = bags.open;
const texts = content.album.pungi;

// Lengths in the reference's px (docs/pungi-stickere-referinta.html, a
// 340px page) as CSS: in u, so they follow the page's size.
const r = (px: number) => u(px * bags.refScale);
// "0 6u 12u ..." with every "Nu" in the reference's px (see r).
const rCss = (value: string) => value.replace(/([\d.]+)u\b/g, (_, n) => r(Number(n)));

// Taps here are this page's own: they never turn the album's page.
const keep = (e: SyntheticEvent) => e.stopPropagation();
const keepAll = (e: SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const ORDER: CategorieSticker[] = ["normale", "holografice"];

// What the page is doing (one bag at a time, `opened`):
//   closed      both bags in their places, wiggling now and then
//   pouring     the bag opens and pours; its stickers wait in its mouth
//   out         the stickers fly out and lie spread on the page
//   collecting  they fly back into its mouth, the bag still small (its
//               pour runs to its end even if "strânge" came early)
//   parked      a moment small in the corner, the pour done with
//   returning   both bags go back to their places
type Phase = "closed" | "pouring" | "out" | "collecting" | "parked" | "returning";

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
// the first stickers of each showing through the plastic. A tap on one
// opens it: it pours its stickers out over the page and lands small in the
// corner, the other one fades; "strânge în pungă" puts them back. Timings
// and curves as in the reference. Only transform and opacity move; no
// filter, backdrop-filter or blend mode (the page is in 3D: Safari).
// Leaving the page (live false) closes everything at once.
export function StickerBags({ live }: { live: boolean }) {
  const [opened, setOpened] = useState<CategorieSticker | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const timers = useRef<number[]>([]);
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
    }
  }
  // ...and the pending steps of an animation forgotten.
  useEffect(() => {
    if (!live) clearTimers();
  }, [live]);
  useEffect(() => clearTimers, []);

  const stickere = useMemo(
    () => Object.fromEntries(ORDER.map((c) => [c, getStickere(c)])) as Record<CategorieSticker, Sticker[]>,
    [],
  );

  const openBag = (c: CategorieSticker) => {
    if (phase !== "closed" || !stickere[c].length) return;
    setOpened(c);
    setPhase("pouring");
    later(open.flyAfter, () => setPhase("out"));
  };

  const collect = () => {
    if (phase !== "out" || !opened) return;
    const n = stickere[opened].length;
    setPhase("collecting");
    // The last one leaves (n - 1) staggers after the first, then flies.
    const flown = Math.max(open.collect.after, (n - 1) * open.collect.stagger + open.fly.duration);
    later(flown, () => setPhase("parked"));
    // A moment later (the parked place drawn first): glide back from it.
    later(flown + 0.05, () => setPhase("returning"));
    later(flown + 0.05 + open.back.duration, () => {
      setOpened(null);
      setPhase("closed");
    });
  };

  return (
    <>
      {ORDER.map((c, i) => (
        <Bag
          key={c}
          categorie={c}
          stickere={stickere[c]}
          live={live}
          delay={i * bags.wiggle.delay}
          // Its own state: in its place, opening, small, gone.
          mode={
            opened === null || phase === "closed"
              ? "idle"
              : opened !== c
                ? phase === "returning"
                  ? "idle-back"
                  : "gone"
                : phase === "pouring" || phase === "out" || phase === "collecting"
                  ? "pour"
                  : phase === "parked"
                    ? "parked"
                    : "back"
          }
          onOpen={() => openBag(c)}
        />
      ))}
      {opened && (phase === "pouring" || phase === "out" || phase === "collecting") && (
        <Spread categorie={opened} stickere={stickere[opened]} atMouth={phase !== "out"} reverse={phase === "collecting"} />
      )}
      {opened && phase === "out" && (
        <button
          type="button"
          onPointerDown={keep}
          onClick={(e) => {
            keepAll(e);
            collect();
          }}
          className="absolute cursor-pointer rounded-full border-0"
          style={{
            left: "50%",
            bottom: r(open.button.bottom),
            translate: "-50% 0",
            padding: rCss(open.button.padding.replace(/px/g, "u")),
            fontFamily: "var(--font-hanken), sans-serif",
            fontWeight: 600,
            fontSize: r(open.button.size),
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            background: open.button.background,
            color: open.button.color,
            zIndex: 60,
          }}
        >
          {texts.strange}
        </button>
      )}
    </>
  );
}

// How a bag looks at the moment:
//   idle       in its place (wiggling)
//   idle-back  the other bag coming back (fading in, then wiggling)
//   gone       faded out while the other is open
//   pour       opened: tips over, pours, lands small in the corner and
//              stays there (the stickers fly out and back)
//   parked     small in the corner, still (before gliding back)
//   back       going back to its place, closing
type Mode = "idle" | "idle-back" | "gone" | "pour" | "parked" | "back";

type BagProps = {
  categorie: CategorieSticker;
  stickere: Sticker[];
  live: boolean;
  delay: number;
  mode: Mode;
  onOpen: () => void;
};

function Bag({ categorie, stickere, live, delay, mode, onOpen }: BagProps) {
  const place = bags.bags[categorie];
  const { body, zip, pull, label, inside } = bags;
  const shown = stickere.slice(0, inside.slots.length);
  const holo = categorie === "holografice";
  const isOpen = mode === "pour" || mode === "parked";
  const base = baseOf(categorie);
  const { first, second, grow } = open.pour;

  // Its movement: wiggling in its place, pouring (CSS keyframes, so the
  // easing applies to each step as in the reference), still in the corner,
  // gliding back.
  const motion: CSSProperties =
    mode === "pour"
      ? { animation: `bag-pour ${open.pour.duration}s ${open.pour.easing} forwards` }
      : mode === "parked"
        ? { transform: "var(--park)" }
        : mode === "back"
          ? { transform: "var(--base)", transition: `transform ${open.back.duration}s ${open.back.easing}` }
          : mode === "gone"
            ? { opacity: 0, pointerEvents: "none", transition: `opacity ${open.other}s` }
            : mode === "idle-back"
              ? { transition: `opacity ${open.other}s` }
              : { animation: `bag-wiggle ${bags.wiggle.period}s ease-in-out ${delay}s infinite` };

  return (
    <button
      type="button"
      aria-label={texts.deschide(texts[categorie])}
      aria-expanded={isOpen}
      disabled={!live}
      onPointerDown={keep}
      onClick={(e) => {
        keepAll(e);
        onOpen();
      }}
      className="absolute cursor-pointer border-0 bg-transparent p-0"
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
            const slot = inside.slots[k];
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

// A sticker's picture fitted in a square of `side` px (its proportions
// kept): its width and height.
function fit(s: Sticker, side: number): [number, number] {
  return s.latime >= s.inaltime ? [side, (side * s.inaltime) / s.latime] : [(side * s.latime) / s.inaltime, side];
}

type SpreadProps = {
  categorie: CategorieSticker;
  stickere: Sticker[];
  // In the bag's mouth (small, turned, unseen) or spread on the page.
  atMouth: boolean;
  // Going back in: the last one first.
  reverse: boolean;
};

// An open bag's stickers on the page: from its mouth to their spots (one
// after the other), and back into it, small in the corner (the last one
// first). Moved with translate / rotate / scale (the path with a little
// overshoot, the turn and size without). They show at once (as in the
// reference); going back, each fades only as it reaches the bag, so it is
// seen going in.
function Spread({ categorie, stickere, atMouth, reverse }: SpreadProps) {
  const spots = useMemo(() => scatterSpots(stickere.length), [stickere.length]);
  const mouth = mouthOf(categorie, reverse);
  const { fly } = open;
  const n = stickere.length;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 50 }}>
      {stickere.map((s, i) => {
        const spot: Spot = spots[i];
        const [w, h] = fit(s, spot.size);
        const at = atMouth ? mouth : spot;
        const delay = reverse ? (n - 1 - i) * open.collect.stagger : i * fly.stagger;
        const turn = atMouth ? fly.startRotations[i % fly.startRotations.length] : spot.rotation;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.id}
            src={s.imagine}
            alt={s.nume}
            width={s.latime}
            height={s.inaltime}
            draggable={false}
            onPointerDown={keep}
            onClick={keepAll}
            className="art absolute left-0 top-0"
            style={{
              width: r(w),
              height: r(h),
              maxWidth: "none",
              pointerEvents: "auto",
              translate: `${r(at.x - w / 2)} ${r(at.y - h / 2)}`,
              rotate: `${turn}deg`,
              scale: atMouth ? `${fly.startScale}` : "1",
              opacity: atMouth ? 0 : 1,
              zIndex: 10 + i,
              transition: [
                `translate ${fly.duration}s ${fly.move} ${delay}s`,
                `rotate ${fly.duration}s ${fly.turn} ${delay}s`,
                `scale ${fly.duration}s ${fly.turn} ${delay}s`,
                reverse ? `opacity ${fly.fade}s linear ${delay + fly.duration - fly.fade}s` : `opacity ${fly.fade}s`,
              ].join(", "),
            }}
          />
        );
      })}
    </div>
  );
}
