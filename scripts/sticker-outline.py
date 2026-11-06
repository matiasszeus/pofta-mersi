# Face un sticker decupat dintr-un PNG transparent: contur alb in jurul formei
# (canalul alfa dilatat, cu marginea netezita) si o umbra mica inclusa in
# imagine (pagina albumului e 3D: acolo nu folosim filter: drop-shadow in CSS).
#
# Folosire:
#   python scripts/sticker-outline.py intrare.png iesire.webp [latime_px] [contur]
#     latime_px  latimea finala a imaginii (implicit 700)
#     contur     grosimea conturului alb, din latimea logo-ului (implicit
#                0.035); 0 = fara contur, doar umbra
# Exemplu:
#   python scripts/sticker-outline.py assets-src/parteneri/caracatita-logo.png public/images/parteneri/etichete-creative-v2.webp 700 0
# Necesita: pip install numpy pillow
import sys
import numpy as np
from PIL import Image, ImageFilter

# Setarile, la o imagine de 700px latime (se scaleaza cu latimea).
OUTLINE = 0.035  # grosimea conturului: din latimea logo-ului
SHADOW_COLOR = (0x10, 0x18, 0x21)  # ink
SHADOW_OPACITY = 0.35
SHADOW_BLUR = 7  # px la 700px
SHADOW_DROP = 8  # px in jos, la 700px
SUPER = 3  # lucram de 3x mai mare, apoi micsoram: margini netede, fara zimti
QUALITY = 90


def distance_to_shape(mask, reach):
    """Distanta (px) de la fiecare pixel la cel mai apropiat pixel al formei,
    exacta pana la `reach` (mai departe: ceva > reach). Transformata separabila:
    intai pe coloane, apoi pe randuri, doar in fereastra +-reach."""
    h, w = mask.shape
    big = float(reach + 1)
    # 1) pe verticala: distanta pana la forma in aceeasi coloana.
    g = np.full((h, w), big)
    run = np.full(w, big)
    for y in range(h):  # de sus in jos
        run = np.where(mask[y], 0.0, np.minimum(run + 1, big))
        g[y] = run
    run = np.full(w, big)
    for y in range(h - 1, -1, -1):  # de jos in sus
        run = np.where(mask[y], 0.0, np.minimum(run + 1, big))
        g[y] = np.minimum(g[y], run)
    # 2) pe orizontala: min peste vecinii pana la reach ai lui g^2 + dx^2.
    g2 = g * g
    d2 = g2.copy()
    for dx in range(1, reach + 1):
        add = dx * dx
        d2[:, dx:] = np.minimum(d2[:, dx:], g2[:, :-dx] + add)
        d2[:, :-dx] = np.minimum(d2[:, :-dx], g2[:, dx:] + add)
    return np.sqrt(d2)


def make_sticker(src, dst, width=700, outline_frac=OUTLINE):
    k = width / 700
    logo = Image.open(src).convert("RGBA")
    logo = logo.crop(logo.getbbox())  # fara margini goale

    blur = SHADOW_BLUR * k
    drop = SHADOW_DROP * k
    pad = 2.2 * blur  # loc pentru umbra, ca sa nu fie taiata
    # latime = logo + 2 contururi + 2 margini pentru umbra
    logo_w = (width - 2 * pad) / (1 + 2 * outline_frac)
    outline = outline_frac * logo_w
    scale = logo_w / logo.width
    logo_h = logo.height * scale
    height = round(logo_h + 2 * outline + 2 * pad + drop)

    # Totul de SUPER ori mai mare.
    S = SUPER
    W, H = width * S, height * S
    lw, lh = round(logo_w * S), round(logo_h * S)
    ox, oy = round((pad + outline) * S), round((pad + outline) * S)
    big = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    big.paste(logo.resize((lw, lh), Image.LANCZOS), (ox, oy))
    alpha = np.asarray(big)[:, :, 3] / 255.0

    # Conturul: tot ce e la cel mult `outline` de forma (alfa >= 0.5), cu o
    # margine de 1px (la scara mare) moale; dupa micsorare: neted.
    r = outline * S
    if r > 0:
        dist = distance_to_shape(alpha >= 0.5, int(np.ceil(r)) + 2)
        sil = np.maximum(np.clip(r + 0.5 - dist, 0, 1), alpha)
    else:
        sil = alpha  # fara contur: umbra urmeaza forma logo-ului
    sil_img = Image.fromarray((sil * 255).astype(np.uint8))

    white = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    white.putalpha(sil_img)
    sticker = white
    sticker.alpha_composite(big)

    # Umbra: silueta, estompata, decalata in jos, sub sticker.
    sh_a = sil_img.filter(ImageFilter.GaussianBlur(blur * S))
    sh_a = sh_a.point(lambda v: round(v * SHADOW_OPACITY))
    shadow = Image.new("RGBA", (W, H), SHADOW_COLOR + (0,))
    shadow.putalpha(Image.new("L", (W, H), 0))
    shadow.paste(Image.new("RGBA", (W, H), SHADOW_COLOR + (255,)), (0, round(drop * S)), sh_a)
    shadow.alpha_composite(sticker)

    out = shadow.resize((width, height), Image.LANCZOS)
    out.save(dst, "WEBP", quality=QUALITY, alpha_quality=100, method=6)
    print(f"{dst}: {width}x{height}, contur {outline:.1f}px, logo {logo_w:.0f}px lat")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__ or "python scripts/sticker-outline.py intrare.png iesire.webp [latime_px]")
    make_sticker(
        sys.argv[1],
        sys.argv[2],
        int(sys.argv[3]) if len(sys.argv) > 3 else 700,
        float(sys.argv[4]) if len(sys.argv) > 4 else OUTLINE,
    )
