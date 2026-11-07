"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import type { AlbumCredit } from "@/config/content";
import { theme } from "@/config/theme";
import { u } from "./albumUnits";
import { hideIfBroken, hideOnError } from "@/lib/mediaError";

const { credit: look } = theme.album.stickereDivider;

// Taps here are this element's own: they never reach the album around it
// (turning a page, the album's link).
const keep = (e: SyntheticEvent) => e.stopPropagation();

// Puts `text` on the clipboard; an older browser (no Clipboard API, or not
// allowed) through a hidden text field and the old copy command.
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // The old way may refuse (or throw) as well: then simply not copied.
    const field = document.createElement("textarea");
    try {
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }
}

// The credit for the stickers' printer on the stickers' divider: their logo
// and a handwritten line with a wavy line drawn under it, together one link
// to their site; under it a strip of washi tape with a discount code at
// their shop, which a tap copies. live: the page lies on the screen (the
// wavy line draws itself then).
export function PartnerCredit({ credit, live }: { credit: AlbumCredit; live: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), look.washi.copiedFor * 1000);
    return () => clearTimeout(t);
  }, [copied]);

  const { logo, text, washi, underline: line, link } = look;

  // The wavy line: drawn (its dash offset from 1 to 0, the path's length
  // being 1) when the page shows, then again every line.every s. Only while
  // the page is on the screen; otherwise unseen, ready to draw.
  const wave = useRef<SVGPathElement>(null);
  useEffect(() => {
    const path = wave.current;
    if (!path || !live) return;
    const drawn = line.draw / line.every;
    const anim = path.animate(
      [
        { strokeDashoffset: 1, easing: "ease-out" },
        { strokeDashoffset: 0, offset: drawn },
        { strokeDashoffset: 0 },
      ],
      { duration: line.every * 1000, iterations: Infinity },
    );
    return () => anim.cancel();
  }, [live, line.draw, line.every]);

  return (
    <>
      <a
        href={credit.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={credit.ariaLabel}
        onPointerDown={keep}
        onClick={keep}
      >
        {/* The whole logo-and-text area taps through to their site (gaps
            included; far more than 44px), under the logo and the text. */}
        <span
          aria-hidden
          className="absolute block"
          style={{ left: u(link.left), top: u(link.top), width: u(link.width), height: u(link.height) }}
        />
        <Image onError={hideOnError} ref={hideIfBroken}
          src={logo.src}
          width={logo.width}
          height={logo.height}
          alt=""
          unoptimized
          // Loaded with the album: a fast leafing may show it any moment.
          loading="eager"
          draggable={false}
          className="absolute select-none"
          style={{ left: u(logo.left), top: u(logo.top), width: u(logo.size), maxWidth: "none", height: "auto", rotate: `${logo.rotation}deg` }}
        />
        <span
          className="absolute"
          style={{ left: u(text.left), top: u(text.top), fontSize: u(text.size), lineHeight: text.lineHeight, rotate: `${text.rotation}deg` }}
        >
          {credit.text.map((row) => (
            <span key={row} className="block whitespace-nowrap">
              {row}
            </span>
          ))}
          <svg
            aria-hidden
            className="absolute overflow-visible"
            viewBox={`0 0 ${line.width} ${line.height}`}
            style={{ left: u(line.left), top: u(line.top), width: u(line.width), height: u(line.height) }}
          >
            <path
              ref={wave}
              d={line.path}
              pathLength={1}
              fill="none"
              stroke={line.color}
              strokeWidth={line.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 1"
              strokeDashoffset={1}
            />
          </svg>
        </span>
      </a>
      <button
        type="button"
        aria-label={credit.copyLabel}
        onPointerDown={keep}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copy(credit.cod).then((ok) => ok && setCopied(true));
        }}
        className="absolute flex cursor-pointer flex-col items-center justify-center p-0 leading-none"
        style={{
          left: u(washi.left),
          top: u(washi.top),
          width: u(washi.width),
          height: u(washi.height),
          rotate: `${washi.rotation}deg`,
          gap: u(washi.gap),
          background: washi.color,
          opacity: washi.opacity,
          // Torn a little unevenly at both ends, like tape.
          clipPath: washi.clipPath,
          color: theme.album.colors.ink,
        }}
      >
        <span className="text-center" style={{ fontSize: u(washi.labelSize), lineHeight: washi.labelLineHeight }}>
          {credit.codLabel.map((row) => (
            <span key={row} className="block whitespace-nowrap">
              {row}
            </span>
          ))}
        </span>
        <span
          aria-live="polite"
          style={{
            fontFamily: "var(--font-hanken), sans-serif",
            fontWeight: 700,
            fontSize: u(washi.codeSize),
            letterSpacing: washi.codeLetterSpacing,
          }}
        >
          {copied ? credit.copied : credit.cod}
        </span>
      </button>
    </>
  );
}
