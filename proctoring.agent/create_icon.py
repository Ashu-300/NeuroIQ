from PIL import Image, ImageDraw, ImageFont

size = 256

# Create base image
img = Image.new("RGBA", (size, size))
draw = ImageDraw.Draw(img)

# Create gradient background
for y in range(size):
    r = int(20 + (70 * y / size))
    g = int(90 + (120 * y / size))
    b = int(180 + (60 * y / size))
    draw.line([(0, y), (size, y)], fill=(r, g, b))

# Rounded rectangle mask
mask = Image.new("L", (size, size), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle((0, 0, size, size), radius=50, fill=255)

rounded = Image.new("RGBA", (size, size))
rounded.paste(img, (0, 0), mask)

draw = ImageDraw.Draw(rounded)

# Load font
try:
    font = ImageFont.truetype("arial.ttf", 170)
except:
    font = ImageFont.load_default()

text = "N"

# Center text
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]

x = (size - text_w) // 2
y = (size - text_h) // 2

# Draw letter
draw.text((x, y), text, fill="white", font=font)

# Save icon with multiple resolutions
rounded.save(
    "icon.ico",
    format="ICO",
    sizes=[(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
)

print("icon.ico created successfully")