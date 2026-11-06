import type { CSSProperties, SyntheticEvent } from "react";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { getStickere, pretCategorie, type CategorieSticker } from "@/lib/catalog";
import { u } from "./albumUnits";

const bags = theme.album.stickerBags;
const texts = content.album.pungi;

// Lengths in the reference's px (docs/pungi-stickere-referinta.html, a
// 340px page) as CSS: in u, so they follow the page's size.
const r = (px: number) => u(px * bags.refScale);
// "0 6u 12u ..." with every "Nu" in the reference's px (see r).
const rCss = (value: string) => value.replace(/([\d.]+)u\b/g, (_, n) => r(Number(n)));

// Taps on a bag are its own: they never turn the page.
const keep = (e: SyntheticEvent) => e.stopPropagation();

const ORDER: CategorieSticker[] = ["normale", "holografice"];

// The stickers' page: two closed ziploc bags, "normale" and "holografice",
// the first stickers of each showing through the plastic. For now only
// their look (they wiggle now and then); opening them comes later.
// No filter, backdrop-filter or blend mode: the page is in 3D (Safari).
export function StickerBags({ live }: { live: boolean }) {
  return (
    <>
      {ORDER.map((categorie, i) => (
        <Bag key={categorie} categorie={categorie} live={live} delay={i * bags.wiggle.delay} />
      ))}
    </>
  );
}

function Bag({ categorie, live, delay }: { categorie: CategorieSticker; live: boolean; delay: number }) {
  const place = bags.bags[categorie];
  const { body, zip, pull, label, inside } = bags;
  const stickere = getStickere(categorie);
  const shown = stickere.slice(0, inside.slots.length);
  const holo = categorie === "holografice";
  return (
    <button
      type="button"
      aria-label={texts.deschide(texts[categorie])}
      disabled={!live}
      onPointerDown={keep}
      onClick={(e) => {
        // Nothing yet (opening: step 2); only the page stays.
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute cursor-pointer border-0 bg-transparent p-0"
      style={
        {
          left: r(place.left),
          top: r(place.top),
          width: r(bags.size.width),
          height: r(bags.size.height),
          "--base": `rotate(${place.rotation}deg)`,
          transform: "var(--base)",
          animation: `bag-wiggle ${bags.wiggle.period}s ease-in-out ${delay}s infinite`,
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: body.radius, background: body.background, boxShadow: rCss(body.shadow) }}
      >
        {/* The stickers, through the plastic (their names only as alt). */}
        <div className="absolute inset-x-0 bottom-0" style={{ top: r(inside.top) }}>
          {shown.map((s, k) => {
            const slot = inside.slots[k];
            const wide = s.latime >= s.inaltime;
            const w = wide ? inside.sticker : (inside.sticker * s.latime) / s.inaltime;
            const h = wide ? (inside.sticker * s.inaltime) / s.latime : inside.sticker;
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
        {/* The zipper: white, a coral stripe under it, its slider on the left. */}
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
