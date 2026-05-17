import os
import re
import shutil

# Target directory mappings for components/pages
MAPPINGS = {
    "App": "src/App.tsx",
    "Index": "src/pages/Index.tsx",
    "Auth": "src/pages/Auth.tsx",
    "Dashboard": "src/pages/Dashboard.tsx",
    "Printers": "src/pages/Printers.tsx",
    "Upload": "src/pages/Upload.tsx",
    "Services": "src/pages/Services.tsx",
    "Order": "src/pages/Order.tsx",
    "BecomeMaker": "src/pages/BecomeMaker.tsx",
    "ServicePrinters": "src/pages/ServicePrinters.tsx",
    "MachineEditor": "src/pages/NewPrinter.tsx",
    "NewPrinter": "src/pages/NewPrinter.tsx",
    "Invest": "src/pages/Invest.tsx",
    "Waitlist": "src/pages/Waitlist.tsx",
    "CheckoutReturn": "src/pages/CheckoutReturn.tsx",
    "Admin": "src/pages/Admin.tsx",
    "Unsubscribe": "src/pages/Unsubscribe.tsx",
    "ResetPassword": "src/pages/ResetPassword.tsx",
    "GiftCards": "src/pages/GiftCards.tsx",
    "RedeemGiftCard": "src/pages/RedeemGiftCard.tsx",
    "GiftCardReturn": "src/pages/GiftCardReturn.tsx",
    "NotFound": "src/pages/NotFound.tsx",
    
    "LayoutVisualization": "src/components/LayoutVisualization.tsx",
    "LaserCutPreview": "src/components/LaserCutPreview.tsx",
    "SvgPreview": "src/components/SvgPreview.tsx",
    "EmbroideryPreview": "src/components/EmbroideryPreview.tsx",
    "StlPreview": "src/components/StlPreview.tsx",
    "CheckoutDialog": "src/components/CheckoutDialog.tsx",
    "DemoCheckout": "src/components/DemoCheckout.tsx",
    "DemoModeBanner": "src/components/DemoModeBanner.tsx",
    "AIAssistant": "src/components/AIAssistant.tsx",
    "CostEstimator": "src/components/CostEstimator.tsx",
    "MakerOrders": "src/components/MakerOrders.tsx",
    "PrinterMatches": "src/components/PrinterMatches.tsx",
    "Hero": "src/components/site/Hero.tsx",
    "HowItWorks": "src/components/site/HowItWorks.tsx",
    "Logo": "src/components/site/Logo.tsx",
}

def identify_file(path):
    with open(path, 'r', errors='ignore') as f:
        content = f.read()
    
    # Try to find default export
    match = re.search(r'export default (?:function\s+)?(\w+)', content)
    if match:
        name = match.group(1)
        if name in MAPPINGS:
            return MAPPINGS[name]
    
    # Special cases
    if "@import" in content and "@tailwind" in content:
        return "src/index.css"
    if "project_id =" in content:
        return "supabase/config.toml"
    if "VITE_SUPABASE_PROJECT_ID" in content:
        return ".env"
    if "-- Migration" in content:
        return "supabase/migrations/recovered_migration.sql"
    
    return None

def restore():
    all_files = []
    for root, dirs, files in os.walk("src"):
        for f in files:
            if re.search(r'[0-9a-f]{40}', f):
                all_files.append(os.path.join(root, f))
    
    for f in os.listdir("."):
        if re.search(r'[0-9a-f]{40}', f):
            all_files.append(f)

    restored = {} # target_path -> (source_path, size)

    for fpath in all_files:
        target = identify_file(fpath)
        if target:
            size = os.path.getsize(fpath)
            if target not in restored or size > restored[target][1]:
                restored[target] = (fpath, size)

    for target, (source, size) in restored.items():
        print(f"Restoring {target} from {source} ({size} bytes)")
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copy2(source, target)

if __name__ == "__main__":
    restore()
