"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import type { Placed } from "@/components/atelier/objectLayout";
import { CartReceipt } from "@/components/cart/CartReceipt";
import { CloseButton, closeCorner } from "@/components/site/CloseButton";
import { useCartGeometry } from "@/components/cart/cartGeometry";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { albumPathOf, chapterOfPath, chapterOfSlug } from "./albumPages";
import { MatAlbum, matAlbumObject } from "./MatAlbum";

const album = matAlbumObject(theme.atelier.objects[0]);
const overrides = { [album.key]: album };

const pill = "rounded-full bg-white/85 px-3 py-1.5 text-black shadow";

// The mat stepping back while the album is open (see dimFade in theme.ts),
// as CSS variables for .mat-dims and the vignette (globals.css).
const { dimFade, dimCenter, dimEdge, objectsOpacity, opening } = theme.album;
const dimVars = {
  "--dim-fade": `${dimFade}s`,
  "--dim-easing": opening.flight.easing,
  "--objects-opacity": objectsOpacity,
} as CSSProperties;

// The atelier's stage with the album drawn in code lying on the mat: a tap
// opens it right there (see MatAlbum), the X puts it back. Used by
// /atelier, /album, /album/<chapter> and /lab/album (see AtelierScreen);
// `lab` adds a button to replay the opening.
//
// initialChapter (/album: "inventar"; /album/<slug>: that slug): arriving
// from a link. The mat appears with the letters already lying still (no
// falling: it would be too much together with the album's opening); once
// the album's cover and the fonts have loaded, after linkOpenDelay, the
// album opens as after a tap, straight at that chapter (the contents if it
// does not exist or is not in the book yet).
//
// The address follows the album (not on /lab/album), so the browser's back
// button closes it:
//   opened with a tap        a new history entry, /album
//   arriving from a link     the entry becomes /atelier, and a new one is
//                            added for the album: back = the atelier
//   leafing                  the entry's address follows the chapter
//                            (replaced, never added: back still closes)
//   X / Escape               back to our entry before (or, if there is
//                            none, the address simply becomes /atelier)
//   back / forward           to /atelier: it closes; to /album...: it
//                            opens there (as from a link)
// Pages the browser keeps and restores (back/forward cache) are left as
// they were.
const linkOpenDelay = theme.album.deepLink.delay; // ms
// Our history entries carry this, so X knows it can go back.
const OURS = "pmAlbum";
// The cart's (/cos) entries carry this one.
const CART = "pmCart";
// A history entry's data: Next.js's own (it keeps the page in it: without
// it, back / forward would load the page again), with our mark or without.
function entry(ours: boolean, mark = OURS) {
  const next = { ...((window.history.state ?? {}) as Record<string, unknown>) };
  delete next[OURS];
  delete next[CART];
  return ours ? { ...next, [mark]: true } : next;
}

// The cart (see theme.cos), from a tap on the calculator:
//   closed     the calculator lies on the mat
//   open       the mat darkens, the calculator slides down to the middle,
//              then the receipt comes out of its slot
//   closing    the receipt goes back into the slot
//   returning  the calculator goes back to its place, the mat lightens
// Its address is /cos (like the album's): a tap adds a history entry, X /
// a tap beside the receipt / Escape go back to the one before; back /
// forward open or close it; a link to /cos opens it by itself.
type CartState = "closed" | "open" | "closing" | "returning";
const cos = theme.cos;

export function AtelierWithAlbum({
  lab = false,
  initialChapter,
  initialCart = false,
}: {
  lab?: boolean;
  initialChapter?: string;
  initialCart?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  // Where the next opening starts (a chapter id).
  const [openAt, setOpenAt] = useState(() =>
    initialChapter === undefined ? "inventar" : (chapterOfSlug(initialChapter) ?? "inventar"),
  );
  const history = !lab;
  // The latest `open`, for the history listener.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Arriving from a link: the entry becomes /atelier, a new one for the
  // album on top (the chapter's address as it really is: /album for a
  // chapter that is not there). Once, on arrival.
  const arrived = useRef(false);
  useEffect(() => {
    if (!history || initialChapter === undefined || arrived.current) return;
    arrived.current = true;
    window.history.replaceState(entry(false), "", "/atelier");
    window.history.pushState(entry(true), "", albumPathOf(openAt));
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens it as from a link: once the cover's picture and the fonts are
  // there, after linkOpenDelay.
  const openFromLink = useCallback((chapter: string) => {
    let cancelled = false;
    const cover = document.querySelector<HTMLImageElement>("[data-object] .ab-cover-front img");
    const ready = Promise.all([document.fonts.ready, cover?.decode().catch(() => {})]);
    ready.then(() => {
      window.setTimeout(() => {
        if (cancelled) return;
        setOpenAt(chapter);
        setOpen(true);
      }, linkOpenDelay);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A link (/album...): open it once it lies on the mat.
  const onAlbumDown = useCallback(() => {
    if (initialChapter !== undefined) openFromLink(openAt);
    // Only for the arrival's chapter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChapter, openFromLink]);

  // The vignette is in the page from the tap until it has faded out after
  // closing (then taken away, not left at opacity 0).
  const [vignette, setVignette] = useState(false);
  if (open && !vignette) setVignette(true);

  // Back on the mat (the same closing animation). A new run: opened again,
  // it starts from the contents.
  const shut = useCallback(() => {
    setOpen(false);
    setRun((n) => n + 1);
    setOpenAt("inventar");
  }, []);
  // X / Escape: back to the entry before ours (its popstate shuts it),
  // or, without one, the address simply becomes /atelier.
  const close = useCallback(() => {
    if (history && window.history.state?.[OURS]) {
      window.history.back();
      return;
    }
    if (history) window.history.replaceState(entry(false), "", "/atelier");
    shut();
  }, [history, shut]);

  // The browser's back / forward buttons.
  useEffect(() => {
    if (!history) return;
    const onPop = () => {
      const chapter = chapterOfPath(window.location.pathname);
      if (chapter === null && openRef.current) shut();
      else if (chapter !== null && !openRef.current) openFromLink(chapter);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [history, shut, openFromLink]);

  // Leafing: the address follows the chapter on the screen (replaced).
  const onChapterChange = useCallback(
    (chapter: string) => {
      if (!history || !openRef.current) return;
      const path = albumPathOf(chapter);
      if (window.location.pathname !== path) window.history.replaceState(window.history.state, "", path);
    },
    [history],
  );

  // Escape closes it too (keyboard), unless a photo is open big over it:
  // Escape closes that first (the closed note's dialog stays in the page,
  // aria-hidden: not counted).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role='dialog']:not([aria-hidden='true'])")) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // A tap on the album: it opens at the contents, with a history entry.
  const onObjectActivate = useCallback(
    (key: string) => {
      if (key !== album.key || openRef.current) return;
      setOpenAt("inventar");
        setOpen(true);
      if (history) window.history.pushState(entry(true), "", "/album");
    },
    [history],
  );

  // --- The cart -----------------------------------------------------------
  const [cart, setCart] = useState<CartState>("closed");
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  const geometry = useCartGeometry();
  const cartTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(cartTimer.current), []);

  const showCart = useCallback(() => {
    if (cartRef.current === "closed") setCart("open");
  }, []);
  // The receipt goes back in (then CartReceipt's onClosed: the calculator
  // goes back to its place).
  const hideCart = useCallback(() => {
    if (cartRef.current === "open") setCart("closing");
  }, []);
  const onReceiptIn = useCallback(() => {
    setCart("returning");
    clearTimeout(cartTimer.current);
    cartTimer.current = window.setTimeout(() => setCart("closed"), cos.calc.move * 1000);
  }, []);
  // A tap on the calculator: a history entry, /cos.
  const onCalcTap = useCallback(() => {
    if (openRef.current || cartRef.current !== "closed") return;
    if (history) window.history.pushState(entry(true, CART), "", "/cos");
    showCart();
  }, [history, showCart]);
  // X / a tap beside the receipt / Escape: back to the entry before ours
  // (its popstate hides it), or, without one, the address becomes /atelier.
  const closeCart = useCallback(() => {
    if (cartRef.current !== "open") return;
    if (history && window.history.state?.[CART]) {
      window.history.back();
      return;
    }
    if (history) window.history.replaceState(entry(false), "", "/atelier");
    hideCart();
  }, [history, hideCart]);

  // Arriving from a link (/cos): the entry becomes /atelier, a new one for
  // the cart on top; it opens once the calculator has faded in on the mat.
  // (The address once; the wait in its own effect, which React may run
  // twice in development: each run starts its timer, the cleanup stops it.)
  const cartArrived = useRef(false);
  useEffect(() => {
    if (!initialCart || cartArrived.current) return;
    cartArrived.current = true;
    if (history) {
      window.history.replaceState(entry(false), "", "/atelier");
      window.history.pushState(entry(true, CART), "", "/cos");
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!initialCart) return;
    const wait = (theme.atelier.note.appearDelay + theme.atelier.mat.fadeIn) * 1000 + cos.linkDelay * 1000;
    const timer = window.setTimeout(showCart, wait);
    return () => clearTimeout(timer);
  }, [initialCart, showCart]);

  // Back / forward: to /cos it opens, away from it it closes.
  useEffect(() => {
    if (!history) return;
    const onPop = () => {
      const atCart = window.location.pathname === "/cos";
      if (atCart && cartRef.current === "closed" && !openRef.current) showCart();
      else if (!atCart) hideCart();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [history, showCart, hideCart]);

  // Escape closes it (not while a dialog over it is open).
  useEffect(() => {
    if (cart !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart, closeCart]);

  const cartUp = cart === "open" || cart === "closing";
  const cartLink = useMemo(
    () => ({ open: cartUp, raised: cart !== "closed", at: geometry?.calc ?? null, onTap: onCalcTap }),
    [cartUp, cart, geometry, onCalcTap],
  );

  const art = useMemo(
    () => ({
      // Given where the album lies on the mat (see matLayout).
      [album.key]: (_: typeof album, place: Placed) => (
        <MatAlbum
          place={place}
          open={open}
          run={run}
          initialPage={openAt}
          onChapterChange={onChapterChange}
        />
      ),
    }),
    [open, run, openAt, onChapterChange],
  );

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as without it.
    <div className={`contents ${open ? "album-open" : ""}`} style={dimVars}>
      <AtelierStage
        onObjectActivate={onObjectActivate}
        objectArt={art}
        objectOverrides={overrides}
        albumOpen={open}
        onAlbumDown={onAlbumDown}
        // From a link: the letters lie still from the start (see above).
        calm={initialChapter !== undefined || initialCart}
        cart={cartLink}
      />
      {/* The cart: the mat darkened (a tap on it closes the cart), the
          receipt over it, the X. */}
      {cart !== "closed" && (
        <div
          aria-hidden
          className="fixed inset-0 h-lvh"
          style={{
            zIndex: 40,
            background: cos.dim.color,
            opacity: cart === "returning" ? 0 : 1,
            transition: `opacity ${cos.dim.fade}s ease`,
            animation: `fade-in ${cos.dim.fade}s ease-out`,
          }}
          onClick={closeCart}
        />
      )}
      {cartUp && geometry && (
        <div role="dialog" aria-modal="true" aria-label={content.cart.receipt.dialog}>
          <CartReceipt
            bottom={geometry.receiptBottom}
            room={geometry.room}
            scale={geometry.scale}
            maxScale={geometry.maxScale}
            phase={cart === "open" ? "printing" : "closing"}
            delay={cos.calc.move}
            onClosed={onReceiptIn}
          />
          <div className={closeCorner} style={{ zIndex: 55 }}>
            <CloseButton onClick={closeCart} label={content.cart.receipt.close} />
          </div>
        </div>
      )}
      {/* The vignette, between the mat (and what lies on it) and the album;
          while open it also takes the taps meant for the things on the mat. */}
      {vignette && (
        <div
          className={`fixed inset-0 z-15 h-lvh ${open ? "album-vignette-in" : "album-vignette-out pointer-events-none"}`}
          style={{ background: `radial-gradient(ellipse at center, ${dimCenter} 0%, ${dimEdge} 100%)` }}
          onAnimationEnd={() => {
            if (!open) setVignette(false);
          }}
        />
      )}
      {open && (
        <div className={`${closeCorner} z-50 flex gap-2 font-sans text-sm`}>
          {lab && (
            <button type="button" className={pill} onClick={() => setRun((n) => n + 1)}>
              {content.album.replay}
            </button>
          )}
          <CloseButton onClick={close} label={content.album.closeAlbum} />
        </div>
      )}
    </div>
  );
}
