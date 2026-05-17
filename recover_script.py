import os
import shutil

# Directory mapping based on content heuristics
def get_dest(content):
    if "import { useState" in content or "import React" in content:
        if "from \"./" in content or "from \"@/" in content:
            if "export default" in content or "function " in content:
                # Likely a component or page
                if "container" in content or "Navbar" in content or "Footer" in content:
                    return "src/pages"
                else:
                    return "src/components"
    if "export type" in content or "export const" in content:
        return "src/lib"
    if "import" not in content and "{" in content and "}" in content:
        # Maybe config?
        return "."
    return "src/misc"

recovered_dir = "recovered_files"
for filename in os.listdir(recovered_dir):
    path = os.path.join(recovered_dir, filename)
    with open(path, 'r', errors='ignore') as f:
        content = f.read(1000)
        
    dest_dir = get_dest(content)
    os.makedirs(dest_dir, exist_ok=True)
    
    # Try to guess extension
    ext = ".tsx" if "import" in content else ".ts"
    if "{" in content and ":" in content and "export" not in content: ext = ".json"
    if "@import" in content: ext = ".css"
    
    # Just moving them with their original hash names to avoid overwrites for now
    shutil.copy2(path, os.path.join(dest_dir, filename + ext))

