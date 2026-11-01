"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MatObjectConfig, Placed } from "@/components/atelier/objectLayout";
import { theme } from "@/config/theme";
import { useStableViewport } from "@/lib/stableViewport";
import { AlbumBook, coverTransform, leafTransform } from "./AlbumBook";
import { AlbumControls } from "./AlbumControls";
import { albumLayout, visibleBox, type AlbumLayout, type ViewBox } from "./albumLayout";
import { albumViews, chapterOfView, firstPageOf, sheets, stackLeft, stackRight, tabsBottom, viewWithPage, type AlbumView } from "./albumPages";

const { opening, page, board, pages, stack, tabs, ribbon, unitWidth } = theme.album;
const { flight, cover: coverTurn } = opening;
const { edgeTapZone, swipeThreshold, hintCurl: hint } = theme.album;
const ms = (seconds: number) => seconds * 1000;

// What a tap or a press on these does is theirs (a photo, a link, the
// coupon, the contents' rows, the tabs): it never turns the page.
const OWN_TAP = "button, a, input, select, textarea, label, [role='button'], [role='dialog']";
// A press held longer than this (ms) is not a tap.
const TAP_MAX_MS = 400;

// The album's settings for the mat: those of theme.ts, but with the
// proportions of the drawn book's page, and its real outline (the letters
// keep clear of it): the board with the pages' edge (right and bottom),
// the tabs on the right, the ribbon below. In fractions of the page's
// width (1u = 1 / unitWidth).
export function matAlbumObject(album: MatObjectConfig): MatObjectConfig {
  const u = 1 / unitWidth;
  // Closed: every sheet on the right.
  const beyond = (board.beyond + stackRight(0)) * u;
  const ribbonLeft = ribbon.left * u;
  return {
    ...album,
    width: 340,
    height: 340 * page.ratio,
    outline: [
      { left: 0, top: -board.top * u, right: 1 + beyond, bottom: page.ratio + beyond },
      { left: 1, top: tabs.top * u, right: 1 + tabs.width * u, bottom: tabsBottom * u },
      { left: ribbonLeft, top: page.ratio, right: ribbonLeft + ribbon.width * u, bottom: page.ratio + ribbon.below * u },
    ],
  };
}

type MatAlbumProps = {
  // Where it lies on the mat, and its turn (see matLayout).
  place: Placed;
  // true = opened (tapped); false = lying on the mat.
  open: boolean;
  // Changes to play the opening again.
  run: number;
  reducedMotion: boolean;
  // Where it opens: "inventar" (the contents) or a chapter's id
  // ("stickere"), see content.album.chapters (/album/stickere passes it).
  initialPage?: string;
  // true = no opening movement: simply there, open (see AtelierWithAlbum).
  instant?: boolean;
  // Called with the chapter on the screen (a chapter id) once open and
  // whenever it changes (see AtelierWithAlbum: the address follows it).
  onChapterChange?: (chapter: string) => void;
};

type Named = "book" | "slide" | "board";

// The album as it lies on the atelier's mat, and the same element opening:
// tapped, it rises off the mat towards you, straightens and settles in the
// middle of the screen while its cover turns open. One movement. Then it
// is leafed through (see albumViews) with a swipe, a tap on a page's outer
// edge or the arrow keys (see "Leafing by hand"); the first time, a page's
// corner lifts as a hint (see "The hint").
//
// It sits inside the mat object's box (MatObject), which is turned by the
// object's rotation. The book is laid out at its open size and shrunk to
// that box while it lies on the mat, so open it is sharp (scale 1).
//
// Every movement is a Web Animation that stays on its element when over,
// holding the last frame ("fill"), for as long as the album is open:
// nothing is swapped or re-rendered when one ends (on iPhone that made the
// book flash for a frame).
export function MatAlbum({ place, open, run, reducedMotion, initialPage = "inventar", instant = false, onChapterChange }: MatAlbumProps) {
  // The visible part of the screen, known only in the browser: again on
  // every resize, and when an in-app browser's bars change it; as it was
  // at zoom 1 while pinch-zoomed in (the book stays put). See
  // stableViewport.
  const b = useStableViewport()?.box;
  const screen = useMemo<ViewBox | null>(
    () => (b ? { left: b.left, top: b.top, width: b.width, height: b.height } : null),
    // Only when a number changes (not when only `zoomed` does).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [b?.left, b?.top, b?.width, b?.height],
  );
  // The page whose corner lifts as a hint (see "The hint"), while it does.
  const [hintPage, setHintPage] = useState<number | null>(null);
  // The mouse is over a page's edge that turns it: a hand cursor there.
  const [overEdge, setOverEdge] = useState(false);
  // The opening (run) that has ended: the buttons show from then on.
  const [openedRun, setOpenedRun] = useState<number | null>(null);
  const opened = open && openedRun === run;
  // The page on the screen (the first one, on wide screens), for this
  // opening (run). Kept as a page, not a view: turning the phone changes
  // the views (two pages each, or one).
  const [nav, setNav] = useState({ run: -1, page: 1 });
  // The latest animation of the book, the slide and the board's shadow
  // (re-aimed on a resize), and every animation of this opening.
  const anims = useRef<Partial<Record<Named, Animation>>>({});
  const all = useRef<Animation[]>([]);
  // A sheet is turning: other presses wait for it. The same as state, for
  // the videos (they show their posters meanwhile).
  const turning = useRef(false);
  const [turningRun, setTurningRun] = useState<number | null>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  // The sheets, front to back (see sheets).
  const leaves = useRef<(HTMLDivElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const layout = screen && albumLayout(screen);
  const views = albumViews(layout?.spread ?? false);
  const index = viewWithPage(nav.run === run ? nav.page : firstPageOf(initialPage), layout?.spread ?? false);

  // Runs an animation that stays when over (see above) and returns it.
  const animate = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions, name?: Named) => {
    if (!el) return null;
    // "both": the first keyframe already holds during a delay, the last
    // one after the end, until the album is closed or replayed.
    const a = el.animate(keyframes, { fill: "both", ...options });
    all.current.push(a);
    if (name) anims.current[name] = a;
    return a;
  };
  const done = (...list: (Animation | null)[]) => Promise.all(list.map((a) => a?.finished));

  // The stacks of pages past the pages (see theme.album.stack): as thick
  // as with `turned` sheets turned. At once, or from `delay` ms on over
  // stack.change seconds (as a sheet passes the middle of its turn). Only
  // the stacks' own parts change (--t / --tl, see AlbumBook); a single
  // keyframe: from wherever they are.
  const setStacks = (turned: number, delay?: number) => {
    const timing = delay === undefined ? { duration: 0 } : { duration: ms(stack.change), delay, easing: "ease-in-out" };
    book.current?.querySelectorAll(".ab-stack-r").forEach((el) => animate(el, [{ "--t": stackRight(turned) }], timing));
    book.current?.querySelectorAll(".ab-stack-l").forEach((el) => animate(el, [{ "--tl": stackLeft(turned) }], timing));
  };

  // The opening (or, when `open` turns false, back on the mat). Runs on a
  // tap and on every replay; not when the screen is resized.
  useEffect(() => {
    const p = open ? flightPoses(place, visibleBox()) : null;
    if (!p) return;
    const spread = p.spread;
    const start = albumViews(spread)[viewWithPage(firstPageOf(initialPage), spread)];
    const now = { duration: 0 };
    // Opening at a chapter: the sheets before it are turned together with
    // the cover, lying under it (never seen leafing; turned at once they
    // would stick out left of the closed book). The stacks are the closed
    // book's until the cover is past the middle.
    const before = sheets.map((_, s) => s).filter((s) => s < start.turned);
    const turnedPose = (s: number) => ({ transform: leafTransform(s, true) });
    const flatPose = (s: number) => ({ transform: leafTransform(s, false) });
    setStacks(0);

    async function play(p: Poses) {
      if (instant) {
        // Simply there, open (a link with prefers-reduced-motion).
        animate(book.current, [{ transform: p.settled }, { transform: p.settled }], now, "book");
        animate(boardRef.current, [{ boxShadow: p.shadowLifted }, { boxShadow: p.shadowLifted }], now, "board");
        animate(cover.current, [{ transform: coverTransform(-180) }, { transform: coverTransform(-180) }], now);
        for (const s of before) animate(leaves.current[s], [turnedPose(s), turnedPose(s)], now);
        const sl = slideFor(start, p.layout);
        animate(slide.current, [{ transform: sl }, { transform: sl }], now, "slide");
        setStacks(start.turned);
        setOpenedRun(run);
        return;
      }
      if (reducedMotion) {
        for (const s of before) animate(leaves.current[s], [turnedPose(s), turnedPose(s)], now);
        setStacks(start.turned);
        // Fade out on the mat, then fade in open in the middle.
        const half = { duration: ms(opening.reducedMotionFade) / 2 };
        await done(animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half));
        animate(book.current, [{ transform: p.settled }, { transform: p.settled }], now, "book");
        animate(cover.current, [{ transform: coverTransform(-180) }, { transform: coverTransform(-180) }], now);
        const s = slideFor(start, p.layout);
        animate(slide.current, [{ transform: s }, { transform: s }], now, "slide");
        await done(animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half));
        setOpenedRun(run);
        return;
      }

      const turn = { duration: ms(coverTurn.duration), delay: ms(coverTurn.delay), easing: coverTurn.easing };
      if (start.turned > 0) setStacks(start.turned, turn.delay + turn.duration / 2);
      await done(
        // The sheets before the chapter, under the cover, with it.
        ...before.map((s) => animate(leaves.current[s], [flatPose(s), turnedPose(s)], turn)),
        // Off the mat, up towards you, down into the middle.
        animate(book.current, bookKeyframes(p), { duration: ms(flight.duration), easing: flight.easing }, "book"),
        // The board's shadow grows wide and soft (the shadow is drawn by
        // the board itself: no extra layer with an opacity in the 3D).
        animate(
          boardRef.current,
          [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }],
          { duration: ms(board.shadowDuration), easing: "ease" },
          "board",
        ),
        // Meanwhile the cover turns open around the spine (from flat to
        // lying on the left, face down).
        animate(cover.current, [{ transform: coverTransform(0) }, { transform: coverTransform(-180) }], turn),
        // Wide screens: the book slides half a page to the right too.
        animate(slide.current, [{ transform: SLIDE_NONE }, { transform: slideFor(start, p.layout) }], turn, "slide"),
      );
      // Open: the buttons appear (the book itself is not touched).
      setOpenedRun(run);
    }

    play(p).catch(() => {}); // cancelled (replay, closing): nothing more to do
    return () => {
      all.current.forEach((a) => a.cancel());
      all.current = [];
      anims.current = {};
      turning.current = false;
    };
    // Only on a tap / replay / closing (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

  // A resize (turning the phone) while open: the same animations, aimed at
  // the new places (only their keyframes change, no element is swapped).
  useEffect(() => {
    if (!screen || !open) return;
    const p = flightPoses(place, screen);
    const set = (a: Animation | undefined, keyframes: Keyframe[]) => {
      if (a?.effect instanceof KeyframeEffect) a.effect.setKeyframes(keyframes);
    };
    const s = slideFor(albumViews(p.spread)[index], p.layout);
    set(anims.current.book, bookKeyframes(p));
    set(anims.current.slide, [{ transform: s }, { transform: s }]);
    // Two pages a view or one: the same page, maybe another sheet turned.
    const turned = albumViews(p.spread)[index].turned;
    leaves.current.forEach((el, s) => {
      const t = leafTransform(s, s < turned);
      animate(el, [{ transform: t }, { transform: t }], { duration: 0 });
    });
    setStacks(turned);
    set(anims.current.board, [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }]);
    // Only on a resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Leafing: from the view on the screen to the next / previous one.
  // Phones: turning a sheet also slides the book one page width, so the
  // page you go to is on the screen; between the two sides of an open
  // spread the book only slides. Wide screens: only the sheet turns.
  const go = (step: number) => turnTo(index + step);
  // The same to view `to`; then `after` (when it has landed).
  const turnTo = (to: number, after?: () => void) => {
    if (!layout || !opened || turning.current || to < 0 || to >= views.length) return;
    const from = views[index];
    const target = views[to];
    turning.current = true;
    setTurningRun(run);
    setHintPage(null);
    setNav({ run, page: target.pages[0] });

    const sheet = (s: number, v: AlbumView) => ({ transform: leafTransform(s, s < v.turned) });
    // The sheets that turn (one, going to the next view).
    const moving = sheets.map((_, s) => s).filter((s) => s < from.turned !== s < target.turned);
    const pane = (v: AlbumView) => ({ transform: slideFor(v, layout) });
    async function turn() {
      if (reducedMotion) {
        // No turning: a crossfade (out, the new page, in).
        const half = { duration: ms(pages.reducedMotionFade) / 2 };
        await done(animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half));
        for (const s of moving) animate(leaves.current[s], [sheet(s, target), sheet(s, target)], { duration: 0 });
        animate(slide.current, [pane(target), pane(target)], { duration: 0 }, "slide");
        setStacks(target.turned);
        await done(animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half));
        return;
      }
      const t = { duration: ms(pages.turn.duration), easing: pages.turn.easing };
      // The stacks change once the sheet is past the middle (upright).
      if (moving.length) setStacks(target.turned, t.duration / 2);
      await done(
        ...moving.map((s) => animate(leaves.current[s], [sheet(s, from), sheet(s, target)], t)),
        animate(slide.current, [pane(from), pane(target)], t, "slide"),
      );
    }
    turn()
      .catch(() => {})
      .finally(() => {
        turning.current = false;
        setTurningRun(null);
        after?.();
      });
  };

  // Leafing to a page (from the contents; later the tabs). One sheet (or
  // none: the two sides of a spread) to turn: a normal turn, as with the
  // buttons. More: a fast leafing: every sheet between the page on the
  // screen and that one turns, one after the other, overlapping, gathering
  // speed then slowing down, the last one as a normal turn (see flipFast in
  // theme.ts), forwards or backwards; on phones the book slides as in
  // go(). The pages in between show what is on them (all of it is in the
  // book already; videos only ever load in the big view). Meanwhile nothing
  // else can be pressed (turning), and the name under the book changes at
  // the end. Then focusChapter's title takes the focus.
  const goToPage = (pageNumber: number, focusChapter?: string) => {
    if (!layout || !opened || turning.current) return;
    const spread = layout.spread;
    const to = viewWithPage(pageNumber, spread);
    if (to === index) return;
    const from = views[index];
    const target = views[to];
    // The chapter's title takes the focus (screen readers, keyboard).
    const focus = () => {
      if (!focusChapter) return;
      requestAnimationFrame(() =>
        book.current?.querySelector<HTMLElement>(`[data-chapter-title="${focusChapter}"]`)?.focus({ preventScroll: true }),
      );
    };
    // The sheets that turn, in the order they turn: forwards from the top
    // one; backwards from the one turned last.
    const lo = Math.min(from.turned, target.turned);
    const hi = Math.max(from.turned, target.turned);
    const moving = Array.from({ length: hi - lo }, (_, i) => lo + i);
    if (target.turned < from.turned) moving.reverse();
    if (moving.length <= 1) {
      turnTo(to, focus);
      return;
    }

    const ff = pages.flipFast;
    const normal = pages.turn;
    // When each of n sheets starts (seconds): the first two and the last
    // two `staggerEdge` apart, those between `staggerMid`.
    const startsFor = (n: number) => {
      const starts = [0];
      for (let i = 1; i < n; i++) starts.push(starts[i - 1] + (i <= 2 || i >= n - 2 ? ff.staggerEdge : ff.staggerMid));
      return starts;
    };
    // Seen turning: all of them, or, if that takes too long, without some
    // in the middle (they jump instead).
    const seen = [...moving];
    while (seen.length > 4 && startsFor(seen.length)[seen.length - 1] + ff.lastDuration > ff.maxTotal) {
      seen.splice(Math.floor(seen.length / 2), 1);
    }
    const starts = startsFor(seen.length).map(ms);
    const total = starts[seen.length - 1] + ms(ff.lastDuration);
    // A skipped sheet jumps as the next one seen starts turning.
    const jumpAt = (s: number) => {
      const next = moving.slice(moving.indexOf(s)).find((x) => seen.includes(x))!;
      return starts[seen.indexOf(next)];
    };
    turning.current = true;
    setTurningRun(run);
    setHintPage(null);

    const sheet = (s: number, v: AlbumView) => ({ transform: leafTransform(s, s < v.turned) });
    const pane = (v: AlbumView) => ({ transform: slideFor(v, layout) });
    async function leaf() {
      if (reducedMotion) {
        // No leafing: a short crossfade straight to the page.
        const half = { duration: ms(pages.reducedMotionFade) / 2 };
        await done(animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half));
        for (const s of moving) animate(leaves.current[s], [sheet(s, target), sheet(s, target)], { duration: 0 });
        animate(slide.current, [pane(target), pane(target)], { duration: 0 }, "slide");
        setStacks(target.turned);
        await done(animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half));
        return;
      }
      const last = seen.length - 1;
      // The stacks change sheet by sheet, each as that sheet passes the
      // middle of its turn (a skipped one: as it jumps).
      const forwards = target.turned > from.turned;
      moving.forEach((s, j) => {
        const i = seen.indexOf(s);
        const passAt = i < 0 ? jumpAt(s) : starts[i] + ms(i === last ? ff.lastDuration : ff.duration) / 2;
        setStacks(forwards ? from.turned + j + 1 : from.turned - j - 1, passAt);
      });
      await done(
        // Each one waits for its turn showing where it was ("fill both");
        // the last one with the normal turn's easing (lastDuration).
        ...seen.map((s, i) =>
          animate(leaves.current[s], [sheet(s, from), sheet(s, target)], {
            duration: ms(i === last ? ff.lastDuration : ff.duration),
            delay: starts[i],
            easing: i === last ? normal.easing : ff.easing,
          }),
        ),
        ...moving
          .filter((s) => !seen.includes(s))
          .map((s) => animate(leaves.current[s], [sheet(s, from), sheet(s, target)], { duration: 1, delay: jumpAt(s) })),
        animate(slide.current, [pane(from), pane(target)], { duration: total, easing: ff.easing }, "slide"),
      );
    }
    leaf()
      .catch(() => {})
      .finally(() => {
        setNav({ run, page: target.pages.includes(pageNumber) ? pageNumber : target.pages[0] });
        turning.current = false;
        setTurningRun(null);
        focus();
      });
  };
  // Leafing to a chapter's first page (its divider): for the contents'
  // buttons, later the tabs on the edge.
  const goToChapter = (chapterId: string) => goToPage(firstPageOf(chapterId), chapterId);

  // --- Leafing by hand ---------------------------------------------------
  // A tap near an edge (edgeTapZone of the width). Decided only by where it
  // is on the screen, measured at the tap (never by the element under the
  // finger: on a phone the neighbouring page shows past the spine, and a
  // tap there used to count from that page's edges, the wrong way):
  //   phone   the album's visible part (its board and cover, cut to the
  //           screen): right 25% = next, left 25% = back, any page
  //   wide    the right page's right 25% = next, the left page's left 25%
  //           = back (and past them, on the book)
  // The middle does nothing (no turning by mistake).
  // Returns 1 = next, -1 = back, 0 = nothing (also: nowhere to go).
  const edgeStep = (target: Element, x: number): number => {
    const bookEl = book.current;
    if (!layout || !bookEl || target.closest(OWN_TAP)) return 0;
    const rectOf = (sel: string) => bookEl.querySelector(sel)?.getBoundingClientRect();
    let step = 0;
    if (!layout.spread) {
      const parts = [rectOf(".ab-board"), rectOf(".ab-cover")].filter((r) => r && r.width > 0) as DOMRect[];
      if (!parts.length) return 0;
      const left = Math.max(0, Math.min(...parts.map((r) => r.left)));
      const right = Math.min(window.innerWidth, Math.max(...parts.map((r) => r.right)));
      const f = (x - left) / (right - left);
      step = f >= 1 - edgeTapZone ? 1 : f <= edgeTapZone ? -1 : 0;
    } else {
      // The pages on the screen: the left one (the cover's inside at the
      // start), the right one.
      const shown = views[index].pages;
      const rightNum = shown.find((n) => n % 2 === 1);
      const leftNum = shown.find((n) => n % 2 === 0);
      const rightPage = rightNum ? rectOf(`[data-page="${rightNum}"]`) : undefined;
      const leftPage = leftNum ? rectOf(`[data-page="${leftNum}"]`) : rectOf(".ab-lining");
      if (rightPage && x >= rightPage.right - rightPage.width * edgeTapZone) step = 1;
      else if (leftPage && x <= leftPage.left + leftPage.width * edgeTapZone) step = -1;
    }
    return index + step >= 0 && index + step < views.length ? step : 0;
  };

  // The latest of these, for the listeners below (added once per opening).
  const latest = useRef({ go, edgeStep });
  useEffect(() => {
    latest.current = { go, edgeStep };
  });

  // Swipes, taps and the arrow keys, on the whole window while the album is
  // open (a swipe may end off the book). Only presses that start on the
  // book count, with one finger: a second finger (pinch-zoom) cancels the
  // gesture and nothing turns. A press on a photo, link or button is
  // theirs (OWN_TAP; most of them also stop it from getting here).
  useEffect(() => {
    if (!opened) return;
    let start: { id: number; x: number; y: number; t: number; target: Element } | null = null;
    const down = new Set<number>();
    const onBook = (e: Event) => e.target instanceof Element && !!flyer.current?.contains(e.target);

    const onDown = (e: PointerEvent) => {
      down.add(e.pointerId);
      if (down.size > 1) {
        start = null; // two fingers: a pinch, not a swipe
        return;
      }
      if (!e.isPrimary || e.button !== 0 || !onBook(e)) return;
      const target = e.target as Element;
      if (target.closest(OWN_TAP)) return;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, target };
    };
    const onUp = (e: PointerEvent) => {
      down.delete(e.pointerId);
      const s = start;
      if (!s || s.id !== e.pointerId) return;
      start = null;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const far = Math.abs(dx);
      const speed = far / Math.max(1, e.timeStamp - s.t); // px per ms
      const { distance, speed: fast, tapSlop } = swipeThreshold;
      const swiped = far > Math.abs(dy) && (far >= distance || (far > tapSlop && speed >= fast));
      if (swiped) {
        // Swiped to the left: the next page (it comes from the right).
        latest.current.go(dx < 0 ? 1 : -1);
      } else if (Math.hypot(dx, dy) <= tapSlop && e.timeStamp - s.t <= TAP_MAX_MS) {
        // A tap (only here, on pointerup: no click / touchend as well, so
        // one tap is never counted twice). During a turn go() ignores it.
        const step = latest.current.edgeStep(s.target, s.x);
        if (step) latest.current.go(step);
      }
    };
    // The browser took the touch over (scrolling, zooming): no gesture.
    const onCancel = (e: PointerEvent) => {
      down.delete(e.pointerId);
      if (start?.id === e.pointerId) start = null;
    };
    // Mouse: a hand cursor over the edges that turn.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setOverEdge(onBook(e) && latest.current.edgeStep(e.target as Element, e.clientX) !== 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
      // A photo open big (or the note: its closed dialog stays in the page,
      // aria-hidden), or typing somewhere: not for the album.
      if (document.querySelector("[role='dialog']:not([aria-hidden='true'])")) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      latest.current.go(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      setOverEdge(false);
    };
  }, [opened]);

  // --- The hint ------------------------------------------------------------
  // The first time the album is open on this phone / computer (remembered
  // in localStorage), hint.delay after it has opened, the corner of the
  // page on the right lifts twice (PageCurl in AlbumBook). Not with
  // prefers-reduced-motion (whatever theme.motion says), nor if a page is
  // turned first.
  useEffect(() => {
    if (!opened) return;
    let seen = true; // storage blocked: better never than every time
    try {
      seen = localStorage.getItem(hint.storageKey) !== null;
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      if (turning.current) return;
      // The page on the right (phones: the one on the screen).
      const shown = views[index].pages;
      setHintPage(shown.find((n) => n % 2 === 1) ?? shown[0]);
      try {
        localStorage.setItem(hint.storageKey, "1");
      } catch {
        // storage blocked (private browsing): it may show again next time
      }
    }, ms(hint.delay));
    return () => window.clearTimeout(timer);
    // Once per opening (index: the page it opened on).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);
  // Closed: no hint left over for the next opening.
  if (!open && hintPage !== null) setHintPage(null);

  const poses = screen && flightPoses(place, screen);
  // The pages lying still on the screen: open, not turning. Their videos
  // play; prefers-reduced-motion (when honoured): only posters.
  const livePages = opened && turningRun !== run && !reducedMotion ? views[index].pages : [];

  // The chapter on the screen, for the address (see onChapterChange): once
  // open, and when leafing changes it.
  const chapterNow = opened ? chapterOfView(views[index]) : null;
  useEffect(() => {
    if (chapterNow) onChapterChange?.(chapterNow);
  }, [chapterNow, onChapterChange]);

  return (
    // Fills the mat object's box (same proportions as the page).
    <div className="relative w-full" style={{ aspectRatio: `1 / ${page.ratio}` }}>
      {layout && poses && (
        <div
          ref={flyer}
          // The view on the screen (see albumViews), for the automated
          // test (tests/album-nav.spec.ts); only while open.
          data-page-index={opened ? index : undefined}
          className="absolute top-1/2 left-1/2"
          style={{
            width: layout.width,
            height: layout.height,
            marginLeft: -layout.width / 2,
            marginTop: -layout.height / 2,
            // Open: a hand only over the edges that turn (the mat object
            // around it shows one everywhere, for the tap that opens it).
            cursor: opened ? (overEdge ? "pointer" : "default") : undefined,
            // Open: a finger's sideways moves are ours (swipes); the
            // browser keeps only up-down (no zoom anywhere, see NoZoom).
            touchAction: opened ? "pan-y" : undefined,
          }}
        >
          <AlbumBook
            u={layout.u}
            spread={layout.spread}
            bookTransform={poses.rest}
            bookRef={book}
            slideRef={slide}
            coverRef={cover}
            leavesRef={leaves}
            livePages={livePages}
            onGoToChapter={opened ? goToChapter : undefined}
            boardRef={boardRef}
            hintPage={hintPage}
            onHintEnd={() => setHintPage(null)}
          />
        </div>
      )}
      {/* The buttons for screen readers live on the page itself, not in
          the turned box. */}
      {opened &&
        layout &&
        createPortal(
          <AlbumControls
            label={views[index].label}
            onBack={index > 0 ? () => go(-1) : undefined}
            onForward={index < views.length - 1 ? () => go(1) : undefined}
          />,
          document.body,
        )}
    </div>
  );
}

type Poses = { rest: string; lifted: string; settled: string; spread: boolean; shadowLifted: string; layout: AlbumLayout };

// 3D transforms everywhere (translate3d), so Safari never switches the book
// between 3D and 2D drawing.
const SLIDE_NONE = "translate3d(calc(0% + 0px), 0px, 0px)";

// How far the book is slid for a view: wide screens half a page (cover and
// page centred together), phones one page to show a left-hand page; plus
// the shifts that centre the whole book (see albumLayout).
function slideFor(view: AlbumView, layout: AlbumLayout) {
  const x = (percent: number, px: number) => `translate3d(calc(${percent}% + ${px}px), 0px, 0px)`;
  if (layout.spread) return x(50, layout.shiftSpread);
  return view.side === "left" ? x(100, layout.shiftLeft(stackLeft(view.turned))) : x(0, layout.shiftRight);
}

const bookKeyframes = (p: Poses): Keyframe[] => [
  { transform: p.rest },
  { transform: p.lifted, offset: flight.liftAt },
  { transform: p.settled },
];

// The book's transforms, relative to the middle of its box on the mat.
//   rest     shrunk to its size on the mat
//   lifted   at flight.liftAt: bigger than open (closer to you), almost
//            straight, above the middle
//   settled  open size, straight, just above the middle
// Each is first worked out on the screen (move from the box on the mat,
// turn, scale); the box is turned by the object's rotation (on its parent),
// so the move and the turn are then turned back by as much.
function flightPoses(mat: Placed, view: ViewBox): Poses {
  const layout = albumLayout(view);
  // The flight's y values are for a page 340px wide.
  const scaleY = layout.width / 340;
  const toMiddle = {
    x: layout.left + layout.width / 2 - (mat.left + mat.width / 2),
    y: layout.top + layout.height / 2 - (mat.top + mat.height / 2),
  };
  const r = mat.rotation;
  const a = (-r * Math.PI) / 180;
  const pose = (dx: number, dy: number, rotation: number, scale: number) => {
    const x = dx * Math.cos(a) - dy * Math.sin(a);
    const y = dx * Math.sin(a) + dy * Math.cos(a);
    return `translate3d(${x}px, ${y}px, 0px) rotate(${rotation - r}deg) scale(${scale})`;
  };
  const { lifted, settled } = flight;
  return {
    rest: pose(0, 0, r, mat.width / layout.width),
    lifted: pose(toMiddle.x, toMiddle.y + lifted.y * scaleY, lifted.rotation, lifted.scale),
    settled: pose(toMiddle.x, toMiddle.y + settled.y * scaleY, 0, 1),
    spread: layout.spread,
    layout,
    // "24u" -> px at this size.
    shadowLifted: board.shadowLifted.replace(/([\d.]+)u/g, (_, n) => `${Number(n) * layout.u}px`),
  };
}
