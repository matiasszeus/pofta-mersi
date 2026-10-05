// Colors the page itself, not just its content: on phones the page shows
// behind the browser's bars and when the page rubber-bands at the edges.
export function PageBackground({ color }: { color: string }) {
  return (
    <style>{`html, body { background: ${color} !important; overscroll-behavior: none; }`}</style>
  );
}
