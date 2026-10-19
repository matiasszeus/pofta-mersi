import type { CSSProperties, ReactNode } from "react";
import { crazeRetro } from "@/app/fonts";
import { theme } from "@/config/theme";

// The big title of a page after the landing, under the header, lined up with
// the logo. Craze Retro has only A–Z: no diacritics in titles.
export function PageTitle({ children }: { children: ReactNode }) {
  const { color, size, sizeLarge } = theme.pageTitle;

  return (
    <h1
      className={`${crazeRetro.className} relative z-10 mt-2 pl-[calc(max(env(safe-area-inset-left),12px)+8px)] leading-none text-[length:var(--title-size)] md:pl-[calc(max(env(safe-area-inset-left),24px)+8px)] md:text-[length:var(--title-size-large)]`}
      style={
        {
          color,
          "--title-size": `${size}px`,
          "--title-size-large": `${sizeLarge}px`,
        } as CSSProperties
      }
    >
      {children}
    </h1>
  );
}
