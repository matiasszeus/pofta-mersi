#!/usr/bin/env python3
"""Pune o brățară randată transparent (turntable.py --transparent --webp) pe un fundal
de „studio foto” și scoate fișierele pentru site.

Folosire:
  python3 scripts/bratara-studio.py INTRARE_turntable.webp public/videos/bratari/basalt-studio-720.mp4 \
      --poster public/images/bratari/basalt-studio-poster.webp --blur public/images/bratari/basalt-studio-blur.webp

Opțiuni:
  --bg studio | #RRGGBB   fundalul (implicit: studio = gri-alb cu gradient moale)
  --shadow 0.22           cât de închisă e umbra de sub brățară (0 = fără)
  --fps 30                cadre pe secundă în MP4
  --poster-frame 0        ce cadru se folosește pentru poster și blur
Necesită: numpy, Pillow, ffmpeg în PATH.
"""
import argparse, os, shutil, subprocess, tempfile
import numpy as np
from PIL import Image, ImageSequence, ImageFilter

def studio_bg(S, seed=1):
    y, x = np.mgrid[0:S, 0:S]
    d = np.sqrt((x - S / 2) ** 2 + ((y - S * 0.42) * 1.1) ** 2) / (S * 0.75)
    t = np.clip(d, 0, 1)[..., None] ** 1.4
    c0, c1 = np.array([250, 250, 248]), np.array([214, 217, 221])
    bg = c0 * (1 - t) + c1 * t
    bg += np.random.default_rng(seed).normal(0, 2.2, (S, S, 1))  # puțin grain, să nu facă benzi
    return Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), "RGB")

def solid_bg(S, hexcol):
    h = hexcol.lstrip("#")
    return Image.new("RGB", (S, S), tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))

def compose(frame, bg, shadow):
    S = bg.width
    f = frame.convert("RGBA").resize((S, S), Image.LANCZOS) if frame.size != (S, S) else frame.convert("RGBA")
    out = bg.convert("RGBA")
    if shadow > 0:
        a = f.getchannel("A")
        sh = a.resize((S, int(S * 0.25))).filter(ImageFilter.GaussianBlur(S / 50))
        layer = Image.new("L", (S, S), 0)
        layer.paste(sh, (0, int(S * 0.62)))
        layer = layer.point(lambda v: int(v * shadow))
        dark = Image.new("RGBA", (S, S), (40, 44, 52, 255))
        dark.putalpha(layer)
        out.alpha_composite(dark)
    out.alpha_composite(f)
    return out.convert("RGB")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out_mp4")
    ap.add_argument("--poster"); ap.add_argument("--blur")
    ap.add_argument("--bg", default="studio"); ap.add_argument("--shadow", type=float, default=0.22)
    ap.add_argument("--fps", type=float, default=30); ap.add_argument("--poster-frame", type=int, default=0)
    ap.add_argument("--crf", type=int, default=23)
    a = ap.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg nu e instalat (Windows: winget install ffmpeg)")
    src = Image.open(a.inp)
    frames = ImageSequence.Iterator(src)
    first = src.convert("RGBA")
    S = max(first.size)
    bg = studio_bg(S) if a.bg == "studio" else solid_bg(S, a.bg)
    tmp = tempfile.mkdtemp()
    n = 0
    poster = None
    for i, fr in enumerate(frames):
        img = compose(fr.copy(), bg, a.shadow)
        img.save(os.path.join(tmp, f"f{i:05d}.png"))
        if i == a.poster_frame:
            poster = img
        n += 1
    os.makedirs(os.path.dirname(os.path.abspath(a.out_mp4)), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(a.fps), "-i", os.path.join(tmp, "f%05d.png"),
                    "-c:v", "libx264", "-crf", str(a.crf), "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-an", a.out_mp4], check=True)
    if a.poster and poster:
        os.makedirs(os.path.dirname(os.path.abspath(a.poster)), exist_ok=True)
        poster.save(a.poster, quality=85)
    if a.blur and poster:
        os.makedirs(os.path.dirname(os.path.abspath(a.blur)), exist_ok=True)
        b = poster.resize((240, 240), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
        b = Image.eval(b, lambda v: int(v * 0.88))
        b.save(a.blur, quality=70)
    shutil.rmtree(tmp)
    print(f"gata: {n} cadre -> {a.out_mp4}")

if __name__ == "__main__":
    main()
