import { content } from "@/config/content";

type AlbumControlsProps = {
  label: string;
  onBack?: () => void; // undefined = nowhere to go: the button is off
  onForward?: () => void;
};

// The open album's buttons, for screen readers and the keyboard's Tab key
// only (sr-only: in the page but not drawn). Everyone else leafs with a
// swipe, a tap on a page's outer edge or the arrow keys (see MatAlbum).
// The page's name ("2 · stickere") is read out when it changes (aria-live).
export function AlbumControls({ label, onBack, onForward }: AlbumControlsProps) {
  const text = content.album;
  return (
    <div className="sr-only">
      <button type="button" disabled={!onBack} onClick={onBack}>
        {text.previousPage}
      </button>
      <p aria-live="polite">{label}</p>
      <button type="button" disabled={!onForward} onClick={onForward}>
        {text.nextPage}
      </button>
    </div>
  );
}
