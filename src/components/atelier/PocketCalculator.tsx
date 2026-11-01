"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { crazeRetro } from "@/app/fonts";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { useCos } from "@/lib/cart";
import type { Placed } from "./objectLayout";

const calc = theme.atelier.calc;
const colors = calc.colors;

// Every size below is the reference's (docs/calculator-cos-referinta.html),
// drawn 180px wide; --k is px per reference px (a length), so all of it
// scales with the calculator's width.
const px = (n: number) => `calc(var(--k) * ${n})`;
const hanken = "var(--font-hanken), sans-serif";

// The digits: 7 segments each, drawn in SVG units. A cell is 9 x 16, one
// every 11. Segments, as [x, y, width, height] in a cell:
//   0 top, 1 bottom, 2 middle, 3 top left, 4 top right, 5 bottom left,
//   6 bottom right
const SEGMENTS = [
  [1.2, 0, 6.6, 1.8],
  [1.2, 14.2, 6.6, 1.8],
  [1.2, 7.1, 6.6, 1.8],
  [0, 0.9, 1.8, 6.6],
  [7.2, 0.9, 1.8, 6.6],
  [0, 8.5, 1.8, 6.6],
  [7.2, 8.5, 1.8, 6.6],
];
// Which segments each character lights.
const LIT: Record<string, number[]> = {
  "0": [0, 1, 3, 4, 5, 6],
  "1": [4, 6],
  "2": [0, 4, 2, 5, 1],
  "3": [0, 4, 2, 6, 1],
  "4": [3, 2, 4, 6],
  "5": [0, 3, 2, 6, 1],
  "6": [0, 3, 2, 5, 6, 1],
  "7": [0, 4, 6],
  "8": [0, 1, 2, 3, 4, 5, 6],
  "9": [0, 4, 6, 1, 3, 2],
  "+": [2], // plus its upright bar (below)
  " ": [],
};
const PITCH = 11;

type DigitsProps = {
  // One character per cell ("0"-"9", "+", " " = off).
  cells: string[];
  color: string;
  off: number; // opacity of the segments that are off (faint "8"s)
  on: number;
  // A comma (a small square at the bottom) after this cell.
  commaAfter?: number;
  style?: CSSProperties;
};

// A row of 7-segment digits, right-aligned in its box.
function Digits({ cells, color, off, on, commaAfter, style }: DigitsProps) {
  const rect = (x: number, y: number, w: number, h: number, opacity: number, key: string, rx = 0.7) => (
    <rect key={key} x={x} y={y} width={w} height={h} rx={rx} fill={color} opacity={opacity} />
  );
  return (
    <svg
      viewBox={`-1 -1 ${cells.length * PITCH + 1} 18`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden
      style={style}
    >
      {cells.map((char, i) => {
        const x0 = i * PITCH;
        return (
          <g key={i}>
            {SEGMENTS.map(([x, y, w, h], s) => rect(x0 + x, y, w, h, off, `off${s}`))}
            {(LIT[char] ?? []).map((s) => {
              const [x, y, w, h] = SEGMENTS[s];
              return rect(x0 + x, y, w, h, on, `on${s}`);
            })}
            {char === "+" && rect(x0 + 3.6, 4.3, 1.8, 7.4, on, "plus")}
          </g>
        );
      })}
      {commaAfter !== undefined && rect(commaAfter * PITCH + 9.6, 14.2, 1.8, 1.8, 1, "comma", 0.5)}
    </svg>
  );
}

// The total on the LCD: 4 digits, the comma, 2 decimals (blank leading
// cells); over 9999,99: "9999+".
function lcdCells(total: number) {
  if (total > 9999.99) return { cells: [" ", "9", "9", "9", "9", "+"], comma: false };
  const [whole, decimals] = total.toFixed(2).split(".");
  return { cells: (whole.padStart(4, " ") + decimals).split(""), comma: true };
}

const KEYS: [string, string][] = [
  ["7", colors.keyDigit], ["8", colors.keyDigit], ["9", colors.keyDigit], ["÷", colors.keyOperation],
  ["4", colors.keyDigit], ["5", colors.keyDigit], ["6", colors.keyDigit], ["×", colors.keyOperation],
  ["1", colors.keyDigit], ["2", colors.keyDigit], ["3", colors.keyDigit], ["−", colors.keyOperation],
  ["C", colors.keyClear], ["0", colors.keyDigit], ["=", colors.keyEquals], ["+", colors.keyOperation],
];

// The pocket calculator lying on the atelier's mat: the cart. The LED
// shows how many pieces are in it, the LCD their total in lei; the keys
// are only drawn. All of it is one link to /cos.
//
// place: its box on the mat, in CSS px, and its turn around the middle
// (see matLayout).
export function PocketCalculator({ place: rect }: { place: Placed }) {
  const { total, bucati } = useCos();
  const lcd = lcdCells(total);
  const totalText = total.toFixed(2).replace(".", ",");
  const vars = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    "--k": `${rect.width / 180}px`,
    // Fades in with the note (see .note-appear).
    "--note-appear-duration": `${theme.atelier.mat.fadeIn}s`,
    "--note-appear-delay": `${theme.atelier.note.appearDelay}s`,
    rotate: `${rect.rotation}deg`,
    filter: `drop-shadow(0 ${px(16.2)} ${px(14.4)} ${colors.shadow})`,
  } as CSSProperties;

  return (
    <Link
      href="/cos"
      data-calc
      aria-label={content.cart.calcLabel(bucati, totalText)}
      className="note-appear mat-dims absolute z-10 block"
      style={vars}
    >
      {/* The body */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: px(16.2),
          background: `linear-gradient(160deg, ${colors.body[0]} 0%, ${colors.body[1]} 45%, ${colors.body[2]} 100%)`,
          boxShadow: `inset 0 ${px(2.2)} 0 rgb(255 255 255 / 0.12), inset 0 ${px(-3.6)} 0 rgb(0 0 0 / 0.35)`,
        }}
      />
      {/* MERSI CALC */}
      <div className="absolute flex items-center" style={{ left: px(16.2), top: px(12.6), gap: px(5.4) }}>
        <div className={`${crazeRetro.className} leading-none`} style={{ fontSize: px(15.3), color: colors.brand }}>
          MERSI
        </div>
        <div style={{ fontFamily: hanken, fontSize: px(9), color: colors.brandSmall, letterSpacing: "0.12em" }}>CALC</div>
      </div>
      {/* LED: the pieces in the cart */}
      <div
        className="absolute box-border"
        style={{
          right: px(16.2),
          top: px(10.4),
          width: px(54),
          height: px(18),
          borderRadius: px(3.2),
          background: colors.ledBackground,
          boxShadow: `inset 0 0 0 1px rgb(0 0 0 / 0.6), inset 0 ${px(1.8)} ${px(3.6)} rgb(0 0 0 / 0.8)`,
          padding: `${px(2.9)} ${px(3.6)}`,
        }}
      >
        <Digits
          cells={String(Math.min(bucati, 9999)).padStart(4, " ").split("")}
          color={colors.led}
          off={calc.ledOff}
          on={1}
          style={{
            filter: `drop-shadow(0 0 ${px(1.5)} rgb(76 242 60 / 0.85)) drop-shadow(0 0 ${px(4)} rgb(76 242 60 / 0.45))`,
          }}
        />
      </div>
      {/* LCD: the total in lei */}
      <div
        className="absolute box-border"
        style={{
          left: px(16.2),
          right: px(16.2),
          top: px(36),
          height: px(54),
          borderRadius: px(7.2),
          background: colors.lcdFrame,
          padding: px(5.4),
        }}
      >
        <div
          className="relative h-full w-full"
          style={{
            borderRadius: px(4.5),
            background: `linear-gradient(180deg, ${colors.lcd[0]}, ${colors.lcd[1]})`,
            boxShadow: `inset 0 ${px(2.7)} ${px(5.4)} rgb(0 0 0 / 0.25)`,
          }}
        >
          <div
            className="absolute"
            style={{
              right: px(8.1),
              top: px(4.5),
              fontFamily: hanken,
              fontSize: px(8.1),
              fontWeight: 600,
              color: "rgb(29 38 51 / 0.75)",
              letterSpacing: "0.06em",
              lineHeight: 1.2,
            }}
          >
            LEI
          </div>
          <div className="absolute" style={{ left: px(7.2), right: px(7.2), bottom: px(3.6), height: px(22.5) }}>
            <Digits
              cells={lcd.cells}
              color={colors.lcdDigits}
              off={calc.lcdOff}
              on={calc.lcdOn}
              commaAfter={lcd.comma ? 3 : undefined}
            />
          </div>
        </div>
      </div>
      {/* The keys: only drawn */}
      <div
        aria-hidden
        className="absolute grid grid-cols-4 grid-rows-4"
        style={{ left: px(16.2), right: px(16.2), top: px(102.6), bottom: px(16.2), gap: px(7.2) }}
      >
        {KEYS.map(([label, background]) => (
          <div
            key={label}
            className="flex items-center justify-center leading-none"
            style={{
              background,
              borderRadius: px(6.3),
              boxShadow: `0 ${px(3.2)} 0 rgb(0 0 0 / 0.35)`,
              fontFamily: hanken,
              fontWeight: 600,
              fontSize: px(13),
              color: colors.keyText,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </Link>
  );
}
