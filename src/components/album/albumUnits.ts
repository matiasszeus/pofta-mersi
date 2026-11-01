// A length in u (see theme.album), as CSS: --u is set on the book.
export const u = (n: number) => `calc(var(--u) * ${n}px)`;
// The same, minus / plus the stack's thickness (--t, in u).
export const uMinusT = (n: number) => `calc(var(--u) * (${n}px - var(--t) * 1px))`;
// "0 3u 6u ..." -> the same with every "Nu" as CSS (see u).
export const uCss = (value: string) => value.replace(/([\d.]+)u\b/g, (_, n) => u(Number(n)));
