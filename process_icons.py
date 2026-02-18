import os
import sys
from PIL import Image
import numpy as np

# Path to icons
ICON_DIR = r"c:\Users\devda\iron-ai\src\assets\icons"

# Mapping logic (based on file modification time)
# We need to map the 6 new hf_ files to these target names
TARGETS = [
    "quick_water.png",
    "quick_protein.png",
    "quick_eggs.png",
    "quick_chicken.png",
    "chef_hat.png",
    "utensils.png"
]

def remove_background(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        data = np.array(img)
        
        # Simple thresholding for black background
        # Pixels closer to black (0,0,0) get transparent
        r, g, b, a = data.T
        
        # Condition: strict black or very dark grey
        black_areas = (r < 50) & (g < 50) & (b < 50)
        
        data[..., 3][black_areas.T] = 0
        
        return Image.fromarray(data)
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None

def main():
    # Get all hf_ files sorted by time
    files = [f for f in os.listdir(ICON_DIR) if f.startswith("hf_")]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(ICON_DIR, x)))
    
    print(f"Found {len(files)} new files.")

    for i, filename in enumerate(files):
        if i >= len(TARGETS):
            break
            
        old_path = os.path.join(ICON_DIR, filename)
        new_name = TARGETS[i]
        new_path = os.path.join(ICON_DIR, new_name)
        
        print(f"Processing {filename} -> {new_name}")
        
        # Remove background
        new_img = remove_background(old_path)
        
        if new_img:
            # Save as PNG to support transparency
            new_img.save(new_path, "PNG")
            print(f"Saved {new_name}")
            
            # Remove original if different name
            if old_path != new_path:
                try:
                    os.remove(old_path)
                    print(f"Removed original {filename}")
                except:
                    pass
        else:
            print(f"Failed to process {filename}")

if __name__ == "__main__":
    main()
