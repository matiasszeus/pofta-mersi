"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { crazeRetro } from "@/app/fonts";
import { drawnTitle } from "@/components/album/albumPages";
import { content } from "@/config/content";
import { produse } from "@/config/products";
import { theme } from "@/config/theme";
import { goleste, restaureaza, seteaza, useCos, useCosItems, type CartItem } from "@/lib/cart";
import { deVanzare, getSticker, reducereStickere } from "@/lib/catalog";

const c = theme.cos;
const fold = c.fold;
const t = content.cart.receipt;
// A length in the reference's px, as CSS: times --r (the receipt's scale).
const r = (n: number) => `calc(var(--r) * ${n}px)`;
const hanken = "var(--font-hanken), sans-serif";
const keep = (e: SyntheticEvent) => e.stopPropagation();

// The jagged top and bottom edges (teeth `zigzag` px wide): a mask, the
// same on the dark outline and on the paper inside it.
const zigzag = (tooth: string): CSSProperties => {
  const m = `conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / ${tooth} 51% repeat-x, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / ${tooth} 51% repeat-x`;
  return { WebkitMask: m, mask: m };
};

// One line of the receipt: a product in the cart.
type Line = { id: string; name: string; holo: boolean; available: boolean; qty: number };
type Group = "petic" | "fir";

// A product by its id, from the catalogs: its group (PETIC: the stickers,
// FIR: the bracelets), its name, and whether it can be bought now.
function lineOf(id: string, qty: number): (Line & { group: Group }) | null {
  const s = getSticker(id);
  if (s) return { id, group: "petic", name: s.nume, holo: s.categorie === "holografice", available: deVanzare(s), qty };
  const p = produse.find((x) => x.id === id);
  if (p) return { id, group: "fir", name: p.nume, holo: false, available: true, qty };
  return null; // an id no catalog knows: not on the receipt
}

// Today, as on a receipt: 07.11.2026.
const today = () => {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`;
};

// The parts below the lines that go when the cart empties, top to bottom
// ("goleste cosul" first, right under the last line).
const TAIL = ["clear", "brush1", "total", "brush2", "splash"];
// Under PETIC: the discount's line, or how many stickers short of it.
const DISCOUNT = ["discount", "hint"];
const headOf = (g: Group) => `head-${g}`;

type CartReceiptProps = {
  // Where it prints: its bottom (px from the screen's top: the calculator's
  // slot), how much room it has above (px), its scale.
  bottom: number;
  room: number;
  scale: number;
  // Up to this scale if it still fits in its room (wider screens).
  maxScale: number;
  // printing: coming out of the slot (after `delay` s); closing: going back
  // in, then onClosed.
  phase: "printing" | "closing";
  delay: number;
  onClosed: () => void;
};

// The cart as a receipt (docs/cos-bon-referinta.html): MERSI between lilac
// lines with little stars; the groups PETIC (stickers) and FIR (bracelets)
// with their pieces, a line per product (its name in Craze Retro: capitals,
// no diacritics; HOLO on a holographic one; − / + from 1 to c.max, − at 1
// taking it out); the total between two spinning coins; a white splash with
// TE PUP (not wired yet); the date, handwritten; "goleste cosul" (after a
// "sigur?"; then "anuleaza" for a few seconds). A product that can no longer
// be bought: struck through, "nu mai e", not counted. An empty cart: a
// short receipt.
//
// Taking things out: each part of it (a group's name, a line, the lilac
// strokes, the total, the splash) folds away (its height to 0 and fading,
// see Fold), one after the other; the receipt stays in the calculator's
// slot, so its top edge comes down smoothly, as if the paper went back in.
// Only then is the cart changed (so nothing jumps).
//
// It comes out of the slot (transform only) and scrolls inside itself when
// it is taller than the screen allows.
export function CartReceipt({ bottom, room, scale, maxScale, phase, delay, onClosed }: CartReceiptProps) {
  const body = useRef<HTMLDivElement>(null);
  const items = useCosItems();
  const { total, reducere, stickere } = useCos();
  const rd = reducereStickere;
  // The discount applies (10+ stickers), or is a few stickers away (7-9).
  const discountOn = stickere >= rd.minim;
  const hintOn = !discountOn && stickere >= rd.indemnDeLa;
  const [date] = useState(today);
  const lines = items.map((i) => lineOf(i.id, i.cantitate)).filter((l) => l !== null);
  const groups = (["petic", "fir"] as const)
    .map((g) => ({ g, lines: lines.filter((l) => l.group === g) }))
    .filter((x) => x.lines.length > 0);
  const empty = lines.length === 0;

  // Parts folding away (their keys: a line's id, head-petic, total...);
  // "goleste cosul" asking "sigur?"; emptying; the cart as it was before it
  // was emptied (for "anuleaza", while shown); parts unfolding (after
  // "anuleaza").
  const [going, setGoing] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [undo, setUndo] = useState<CartItem[] | null>(null);
  const [unfolding, setUnfolding] = useState(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const later = (seconds: number, fn: () => void) => timers.current.push(window.setTimeout(fn, seconds * 1000));
  useEffect(() => () => timers.current.forEach((x) => clearTimeout(x)), []);

  // Folds these parts away one after the other (top to bottom, `stagger`
  // apart, the whole at most `total` s), then calls `done`.
  const foldAway = (keys: string[], done: () => void) => {
    busy.current = true;
    const stagger = keys.length > 1 ? Math.min(fold.stagger, (fold.total - fold.duration) / (keys.length - 1)) : 0;
    keys.forEach((k, i) => later(i * stagger, () => setGoing((g) => new Set([...g, k]))));
    later(Math.max(0, keys.length - 1) * stagger + fold.duration, () => {
      done();
      setGoing(new Set());
      busy.current = false;
    });
  };
  // Everything on the receipt above the date, in order (for emptying).
  const allParts = () => [
    ...groups.flatMap(({ g, lines }) => [headOf(g), ...lines.map((l) => l.id), ...(g === "petic" ? DISCOUNT : [])]),
    ...TAIL,
  ];

  // − at 1: the line folds away (with its group's name if it was the last
  // of the group; with the total and the splash if it was the last of all),
  // then it is out of the cart.
  const removeLine = (id: string) => {
    if (busy.current) return;
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    const rest = lines.filter((l) => l.id !== id);
    const keys = [
      ...(rest.some((l) => l.group === line.group) ? [] : [headOf(line.group)]),
      id,
      ...(rest.length ? [] : TAIL),
    ];
    foldAway(keys, () => seteaza(id, 0));
  };
  // "da": everything folds away, one part after the other (~1 s), then the
  // cart is empty; "anuleaza" puts it back as it was.
  const clearAll = () => {
    if (busy.current) return;
    setConfirming(false);
    setClearing(true);
    const snapshot = items.map((i) => ({ ...i }));
    foldAway(allParts(), () => {
      goleste();
      setClearing(false);
      setUndo(snapshot);
      later(c.undo, () => setUndo((u) => (u === snapshot ? null : u)));
    });
  };
  const undoClear = () => {
    if (!undo) return;
    restaureaza(undo);
    setUndo(null);
    setUnfolding(true);
    later(fold.appear, () => setUnfolding(false));
  };
  const part = (key: string) => ({ going: going.has(key), appear: unfolding });

  // Out of the slot, and back in.
  const paper = useRef<HTMLDivElement>(null);
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });
  useLayoutEffect(() => {
    const el = paper.current;
    if (!el) return;
    const hidden = { transform: "translateY(100%)" };
    const shown = { transform: "translateY(0)" };
    const a =
      phase === "printing"
        ? el.animate([hidden, shown], { duration: c.print.duration * 1000, easing: c.print.easing, delay: delay * 1000, fill: "both" })
        : el.animate([{ transform: getComputedStyle(el).transform === "none" ? "translateY(0)" : getComputedStyle(el).transform }, hidden], {
            duration: c.back.duration * 1000,
            easing: c.back.easing,
            fill: "both",
          });
    if (phase === "closing") a.finished.then(() => onClosedRef.current(), () => {});
    return () => {
      if (phase === "printing") a.commitStyles?.();
      a.cancel();
    };
  }, [phase, delay]);

  const totalText = total.toFixed(2).replace(".", ",");

  // Its height at scale 1 (measured once, as it opens): grown towards
  // maxScale only as far as it still fits in its room; kept while it is
  // open (taking lines out never makes it jump to another size).
  const [natural, setNatural] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (body.current) setNatural(body.current.offsetHeight / (Number(body.current.style.getPropertyValue("--r")) || 1));
  }, []);
  // (A little room to spare: not every length grows exactly with it.)
  const r0 = natural ? Math.max(scale, Math.min(maxScale, (room / natural) * 0.97)) : scale;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 flex items-end justify-center overflow-hidden"
      style={{ top: bottom - room, height: room, zIndex: 45, "--r": r0 } as CSSProperties}
    >
      <div ref={paper} className="pointer-events-auto max-h-full" style={{ filter: c.shadow, transform: "translateY(100%)" }} onClick={keep}>
        {/* Scrolls inside itself when it is taller than its room. */}
        <div className="max-h-full overflow-y-auto overscroll-contain" style={{ maxHeight: room, touchAction: "pan-y" }}>
          <div ref={body} className="relative" style={{ width: r(c.width), "--r": r0 } as CSSProperties}>
            <div className="absolute inset-0" style={{ background: c.outline, ...zigzag(r(c.zigzag)) }} />
            <div
              className="relative box-border"
              style={{
                margin: r(c.outlineWidth),
                padding: c.padding.replace(/(\d+)px/g, (_, n) => r(Number(n))),
                color: c.ink,
                backgroundColor: c.paper,
                backgroundImage: c.paperImage,
                ...zigzag(r(c.zigzag)),
              }}
            >
              <StarLine />
              <div className={`${crazeRetro.className} text-center leading-none`} style={{ fontSize: r(c.title), color: c.green, margin: `${r(2)} 0` }}>
                {t.mersi}
              </div>
              <StarLine />

              {empty ? (
                // The empty cart's line (and, just after emptying it, the way
                // back): unfolds into place (no jump).
                <Fold going={false} appear>
                  <div className="text-center" style={{ fontSize: r(c.hand), padding: `${r(18)} 0 ${undo ? r(4) : r(14)}` }}>
                    {t.gol}
                  </div>
                  {undo && (
                    <div className="flex items-center justify-center" style={{ fontSize: r(c.clear.size), color: c.ink, margin: `${r(-8)} 0 ${r(-4)}` }}>
                      <span style={{ opacity: c.clear.opacity }}>{t.golit} ·</span>
                      <HandButton onClick={undoClear}>{t.anuleaza}</HandButton>
                    </div>
                  )}
                </Fold>
              ) : (
                <>
                  {groups.map(({ g, lines }) => (
                    <div key={g}>
                      <GroupLines group={g} lines={lines} part={part} onRemove={removeLine} />
                      {g === "petic" && (
                        <>
                          {/* The stickers' discount: a lilac tag and the sum
                              taken off (the total below is with it). */}
                          <Fold going={part("discount").going || !discountOn}>
                            <div
                              aria-hidden={!discountOn}
                              className="flex items-center justify-between"
                              style={{ padding: `${r(6)} ${r(2)} ${r(2)} ${r(10)}` }}
                            >
                              <span
                                style={{
                                  fontFamily: hanken,
                                  fontWeight: 800,
                                  fontSize: r(c.discount.tag),
                                  padding: `${r(2)} ${r(6)}`,
                                  borderRadius: r(4),
                                  background: c.discount.tagBackground,
                                  color: c.discount.tagColor,
                                }}
                              >
                                {t.reducere(rd.procent)}
                              </span>
                              <span
                                style={{
                                  fontFamily: hanken,
                                  fontWeight: 900,
                                  fontStyle: "italic",
                                  fontSize: r(c.discount.sum),
                                  fontVariantNumeric: "tabular-nums",
                                  marginRight: r(4),
                                }}
                              >
                                {t.scazut(reducere.toFixed(2).replace(".", ","))}
                              </span>
                            </div>
                          </Fold>
                          {/* A few stickers short of it: how many more. */}
                          <Fold going={part("hint").going || !hintOn}>
                            <div
                              aria-hidden={!hintOn}
                              className="text-right"
                              style={{ fontSize: r(c.discount.hint), opacity: c.discount.hintOpacity, padding: `${r(6)} ${r(4)} 0` }}
                            >
                              {t.indemn(Math.max(1, rd.minim - stickere), rd.procent)}
                            </div>
                          </Fold>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Emptying the cart: right under the last line, on the
                      right (under the − / +); its "sigur? da · nu" right
                      there. Finger-sized buttons (c.clear.tap) reaching over
                      the space above and below, so the receipt grows less. */}
                  <Fold {...part("clear")}>
                    <div
                      className="flex flex-wrap items-center justify-end"
                      style={{ fontSize: r(c.clear.size), color: c.ink, margin: `${r(-8)} 0 ${r(-12)}` }}
                    >
                      {clearing ? (
                        // Its place kept while it folds away with the rest.
                        <span aria-hidden style={{ minHeight: c.clear.tap, visibility: "hidden" }}>
                          {t.sigur}
                        </span>
                      ) : confirming ? (
                        <>
                          <span style={{ opacity: c.clear.opacity }}>{t.sigur}</span>
                          <HandButton onClick={clearAll}>{t.da}</HandButton>
                          <span style={{ opacity: c.clear.opacity }}>·</span>
                          <HandButton onClick={() => setConfirming(false)} last>
                            {t.nu}
                          </HandButton>
                        </>
                      ) : (
                        <HandButton onClick={() => setConfirming(true)} last>
                          {t.goleste}
                        </HandButton>
                      )}
                    </div>
                  </Fold>
                  <Fold {...part("brush1")}>
                    <Brush />
                  </Fold>
                  <Fold {...part("total")}>
                    <div
                      className="flex items-center justify-center"
                      style={{ gap: r(10), perspective: r(300) }}
                      role="status"
                      aria-label={t.total(totalText)}
                    >
                      <Coin />
                      <b style={{ fontFamily: hanken, fontWeight: 900, fontStyle: "italic", fontSize: r(c.total), letterSpacing: "0.01em" }}>{totalText}</b>
                      <Coin late />
                    </div>
                  </Fold>
                  <Fold {...part("brush2")}>
                    <Brush />
                  </Fold>
                  {/* A white splash, the order button on it (not wired yet). */}
                  <Fold {...part("splash")}>
                    <div className="relative flex items-center justify-center" style={{ height: r(c.splash.height), marginTop: r(4) }}>
                      <svg
                        aria-hidden
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute"
                        style={{ inset: `${r(-10)} ${r(10)}`, width: "auto", height: `calc(100% + ${r(20)})` }}
                      >
                        <path
                          d="M96.8,50.0 86.1,56.5 95.3,67.2 79.0,68.3 80.6,80.3 65.9,76.1 59.8,83.8 50.0,78.8 40.3,83.6 34.1,76.0 22.5,77.2 21.0,68.3 6.9,66.4 14.9,56.3 5.4,50.0 14.0,43.5 5.0,32.9 22.0,32.4 19.2,19.5 34.1,23.9 38.0,8.7 50.0,20.7 61.7,9.6 66.0,23.8 78.0,22.3 79.0,31.8 92.0,34.0 85.1,43.7Z"
                          fill={c.splash.color}
                        />
                      </svg>
                      <button
                        type="button"
                        className={`${crazeRetro.className} relative cursor-pointer rounded-full border-0`}
                        style={{
                          background: c.green,
                          color: c.go.color,
                          padding: c.go.padding.replace(/(\d+)px/g, (_, n) => r(Number(n))),
                          fontSize: r(c.go.size),
                          boxShadow: c.go.shadow.replace(/(\d+)px/g, (_, n) => r(Number(n))),
                        }}
                      >
                        {t.tePup}
                      </button>
                    </div>
                  </Fold>
                </>
              )}
              <div style={{ fontSize: r(c.hand), paddingTop: r(4) }}>{t.data(date)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A part of the receipt that can fold away: its height going smoothly to
// 0 (a grid row from 1fr to 0fr: no fixed height needed) while it fades,
// in fold.duration; `appear`: unfolding the same way as it comes (the
// empty cart's line, a cart put back). Cut to its box only while it moves
// (the splash reaches past its own).
function Fold({ going, appear = false, children }: { going: boolean; appear?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: going ? "0fr" : "1fr",
        opacity: going ? 0 : 1,
        transition: `grid-template-rows ${fold.duration}s ${fold.easing}, opacity ${fold.duration}s ${fold.easing}`,
        animation: appear ? `fold-open ${fold.appear}s ${fold.easing}` : undefined,
      }}
    >
      <div style={{ minHeight: 0, overflow: going || appear ? "hidden" : "visible" }}>{children}</div>
    </div>
  );
}

// A lilac line with a little four-pointed star in its middle. (The parts
// that never change are memo: not drawn again at every step of a fold.)
const StarLine = memo(function StarLine() {
  const line = <i className="block flex-1" style={{ height: r(3), borderRadius: r(2), background: c.lilac }} />;
  return (
    <div aria-hidden className="flex items-center" style={{ margin: `${r(2)} 0` }}>
      {line}
      <svg viewBox="0 0 20 20" style={{ width: r(22), height: r(22), flex: "none" }}>
        <path d="M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0Z" fill={c.lilac} />
      </svg>
      {line}
    </div>
  );
});

// The thick lilac brush stroke around the total (its margins inside, so
// they fold away with it).
const Brush = memo(function Brush() {
  return (
    <div aria-hidden style={{ padding: `${r(10)} 0` }}>
      <div style={{ height: r(7), borderRadius: `${r(6)} ${r(2)} ${r(6)} ${r(2)}`, background: c.lilac, rotate: "-0.6deg" }} />
    </div>
  );
});

// A group (PETIC / FIR): its name and its pieces (those that count), then a
// line per product; each part folds away on its own.
type Part = (key: string) => { going: boolean; appear: boolean };
type GroupProps = { group: Group; lines: Line[]; part: Part; onRemove: (id: string) => void };
function GroupLines({ group, lines, part, onRemove }: GroupProps) {
  const pieces = lines.filter((l) => l.available && !part(l.id).going).reduce((s, l) => s + l.qty, 0);
  return (
    <div style={{ opacity: lines.some((l) => l.available) ? 1 : c.off }}>
      <Fold {...part(headOf(group))}>
        <div className="flex items-baseline justify-between" style={{ margin: `0 ${r(2)}`, paddingTop: r(8) }}>
          <span className={`${crazeRetro.className} leading-none`} style={{ fontSize: r(c.group), color: c.green }}>
            {group === "petic" ? t.petic : t.fir}
          </span>
          <span style={{ fontFamily: hanken, fontWeight: 900, fontStyle: "italic", fontSize: r(c.groupCount), fontVariantNumeric: "tabular-nums", marginRight: r(4) }}>
            {pieces}
          </span>
        </div>
      </Fold>
      {lines.map((l, i) => (
        <Fold key={l.id} {...part(l.id)}>
          <LineRow line={l} last={i === lines.length - 1} onRemove={onRemove} />
        </Fold>
      ))}
    </div>
  );
}

// A product's line: its name, HOLO, "nu mai e"; − count +. Its spacing is
// padding, inside its fold (it folds away with it).
function LineRow({ line, last, onRemove }: { line: Line; last: boolean; onRemove: (id: string) => void }) {
  const off = !line.available;
  const name = drawnTitle(line.name);
  const qb = (label: string, aria: string, d: number, disabled: boolean) => (
    <button
      type="button"
      aria-label={aria}
      disabled={disabled}
      onClick={(e) => {
        keep(e);
        if (line.qty + d <= 0) onRemove(line.id);
        else seteaza(line.id, line.qty + d, c.max);
      }}
      className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 p-0 disabled:cursor-default disabled:opacity-40"
      style={{ width: r(c.button), height: r(c.button), background: c.lilacLight, color: c.ink, fontFamily: hanken, fontWeight: 700, fontSize: r(13), lineHeight: 1 }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ padding: `${r(4)} ${r(2)} ${last ? r(4) : 0} ${r(10)}` }}>
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "1fr auto", gap: r(8), paddingLeft: r(12), borderLeft: `${r(3)} solid ${c.lilac}`, opacity: off ? c.off : 1 }}
      >
        <span className="flex min-w-0 flex-wrap items-baseline" style={{ gap: `${r(2)} ${r(6)}` }}>
          <span className={`${crazeRetro.className}`} style={{ fontSize: r(c.name), lineHeight: 1.05, textDecoration: off ? "line-through" : undefined }}>
            {name}
          </span>
          {line.holo && <Tag text={t.holo} holo />}
          {!line.available && <Tag text={t.nuMaiE} />}
        </span>
        <span className="flex items-center" style={{ gap: r(7) }}>
          {line.available && qb("−", t.minus(line.name), -1, false)}
          <span
            className="text-center"
            style={{ fontFamily: hanken, fontWeight: 900, fontStyle: "italic", fontSize: r(c.count), minWidth: r(22), fontVariantNumeric: "tabular-nums" }}
          >
            {line.qty}
          </span>
          {line.available && qb("+", t.plus(line.name), 1, line.qty >= c.max)}
        </span>
      </div>
    </div>
  );
}

// A small handwritten button on the receipt ("goleste cosul", "da", "nu",
// "anuleaza"): faded ink, at least c.clear.tap px high (a finger's size);
// `last`: the rightmost of its row.
function HandButton({ onClick, children, last = false }: { onClick: () => void; children: string; last?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        keep(e);
        onClick();
      }}
      className="cursor-pointer border-0 bg-transparent"
      style={{
        minHeight: c.clear.tap,
        padding: last ? `0 ${r(4)} 0 ${r(6)}` : `0 ${r(6)}`,
        font: "inherit",
        color: "inherit",
        opacity: c.clear.opacity,
        textDecoration: "underline",
        textUnderlineOffset: "0.2em",
      }}
    >
      {children}
    </button>
  );
}

function Tag({ text, holo = false }: { text: string; holo?: boolean }) {
  return (
    <span
      style={{
        fontFamily: hanken,
        fontWeight: 700,
        fontSize: r(c.tag),
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: `${r(2)} ${r(5)}`,
        borderRadius: r(4),
        background: holo ? c.holo : c.ink,
        color: holo ? c.ink : c.tagText,
      }}
    >
      {text}
    </span>
  );
}

// A thick coin spinning (3D, transform only): the picture front and back,
// and between them `layers` copies of its shape (alternating colors) for
// its edge. `late`: half a turn behind the other one.
const Coin = memo(function Coin({ late = false }: { late?: boolean }) {
  const { coin } = c;
  const half = ((coin.layers - 1) / 2) * coin.step;
  const face = (back: boolean) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coin.src}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full [backface-visibility:hidden]"
      style={{ transform: `${back ? "rotateY(180deg) " : ""}translateZ(${r(half + 0.5)})` }}
    />
  );
  return (
    <div
      aria-hidden
      className="relative"
      style={{
        width: r(coin.width),
        height: r(coin.height),
        transformStyle: "preserve-3d",
        animation: `coin-spin ${coin.spin}s linear infinite`,
        animationDelay: late ? `${-coin.spin / 2}s` : undefined,
      }}
    >
      {face(true)}
      {Array.from({ length: coin.layers }, (_, i) => (
        <i
          key={i}
          className="absolute inset-0"
          style={{
            background: coin.colors[i % 2],
            WebkitMask: `url(${coin.src}) center / 100% 100% no-repeat`,
            mask: `url(${coin.src}) center / 100% 100% no-repeat`,
            transform: `translateZ(${r(-half + i * coin.step)})`,
          }}
        />
      ))}
      {face(false)}
    </div>
  );
});
