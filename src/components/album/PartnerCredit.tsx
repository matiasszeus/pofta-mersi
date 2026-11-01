"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import type { AlbumCredit } from "@/config/content";
import { theme } from "@/config/theme";
import { u } from "./albumUnits";

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
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

// The credit for the stickers' printer on the stickers' divider: their logo
// and a handwritten line, both a link to their site; under it a strip of
// washi tape with a discount code at their shop, which a tap copies.
export function PartnerCredit({ credit }: { credit: AlbumCredit }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), look.washi.copiedFor * 1000);
    return () => clearTimeout(t);
  }, [copied]);

  const { logo, text, washi } = look;
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
        <Image
          src={logo.src}
          width={logo.width}
          height={logo.height}
          alt=""
          unoptimized
          draggable={false}
          className="absolute select-none"
          style={{ left: u(logo.left), top: u(logo.top), width: u(logo.size), maxWidth: "none", height: "auto", rotate: `${logo.rotation}deg` }}
        />
        <span
          className="absolute"
          style={{ left: u(text.left), top: u(text.top), fontSize: u(text.size), lineHeight: text.lineHeight, rotate: `${text.rotation}deg` }}
        >
          {credit.text.map((line) => (
            <span key={line} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
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
        <span style={{ fontSize: u(washi.labelSize) }}>{credit.codLabel}</span>
        <span
          aria-live="polite"
          style={{
            fontFamily: "var(--font-hanken), sans-serif",
            fontWeight: 700,
            fontSize: u(washi.codeSize),
            letterSpacing: "0.08em",
          }}
        >
          {copied ? credit.copied : credit.cod}
        </span>
      </button>
    </>
  );
}
