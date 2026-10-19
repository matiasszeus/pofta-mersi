import type { CSSProperties } from "react";
import Link from "next/link";
import { crazeRetro } from "@/app/fonts";
import { theme } from "@/config/theme";

// Header for every page after the landing (atelier, stickere, brățări...):
// for now only the logo, top left, linking to the atelier.
//
// env(safe-area-inset-*) = the space the iPhone's notch / status bar takes
// (0 elsewhere); max() keeps a normal margin where there is none.
export function SiteHeader() {
  const { href, logoColor, logoSize, logoSizeLarge } = theme.siteHeader;

  return (
    <header className="relative z-10 flex items-start pt-[max(env(safe-area-inset-top),8px)] pl-[max(env(safe-area-inset-left),12px)] md:pt-[max(env(safe-area-inset-top),16px)] md:pl-[max(env(safe-area-inset-left),24px)]">
      {/* min-h-11 = 44px: the smallest comfortable touch target. The padding
          widens the clickable area around the text too. */}
      <Link
        href={href}
        className={`${crazeRetro.className} inline-flex min-h-11 items-center px-2 leading-none text-[length:var(--logo-size)] md:text-[length:var(--logo-size-large)]`}
        style={
          {
            color: logoColor,
            "--logo-size": `${logoSize}px`,
            "--logo-size-large": `${logoSizeLarge}px`,
          } as CSSProperties
        }
      >
        POFTA MERSI
      </Link>
    </header>
  );
}
