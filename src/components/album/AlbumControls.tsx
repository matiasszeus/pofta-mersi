import { theme } from "@/config/theme";

const { controls } = theme.album.pages;

type AlbumControlsProps = {
  // px from the top of the screen (see albumLayout).
  top: number;
  label: string;
  onBack?: () => void; // undefined = nowhere to go: the button is off
  onForward?: () => void;
};

// Under the open album: ‹ page name ›. Fixed on the screen, outside the
// book (whose parts are turned with the mat), and fading in once it shows.
export function AlbumControls({ top, label, onBack, onForward }: AlbumControlsProps) {
  return (
    <div
      className="fixed inset-x-0 z-50 flex items-center justify-center text-white"
      style={{
        top,
        gap: controls.spacing,
        animation: `fade-in ${controls.fadeIn}s ease 0.05s backwards`,
      }}
    >
      <RoundButton label="Pagina anterioară" onClick={onBack}>
        <path d="M15 5l-7 7 7 7" />
      </RoundButton>
      <div className="text-center" style={{ minWidth: controls.labelWidth, fontSize: controls.labelSize }}>
        {label}
      </div>
      <RoundButton label="Pagina următoare" onClick={onForward}>
        <path d="M9 5l7 7-7 7" />
      </RoundButton>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!onClick}
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center rounded-full border-[1.5px] border-white/55 bg-white/12 p-0 text-white disabled:cursor-default disabled:opacity-35"
      style={{ width: controls.button, height: controls.button }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
