from PIL import Image

def smart_crop(path: str):
    img = Image.open(path)
    w, h = img.size
    top = int(h * 0.04)
    left = 0
    right = w
    bottom = h
    if w > 1280:
        left = int(w * 0.02)
        right = int(w * 0.98)
    cropped = img.crop((left, top, right, bottom))
    cropped.save(path)
