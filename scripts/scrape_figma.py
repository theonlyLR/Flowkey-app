import json
import requests
from bs4 import BeautifulSoup

# Target shortcut reference page
URL = "https://fastshortcuts.com/shortcuts/figma/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

def clean_key(key: str) -> str:
    key_map = {
        "ctrl": "Cmd",
        "cmd": "Cmd",
        "command": "Cmd",
        "alt": "Option",
        "opt": "Option",
        "shift": "Shift"
    }
    return key_map.get(key.lower(), key.capitalize())

def parse_key_combo(combo_str: str) -> list[str]:
    # Split key strings like "Ctrl Shift G" or "Cmd+Alt+K"
    parts = combo_str.replace("+", " ").replace("📋 Copy", "").strip().split()
    return [clean_key(p) for p in parts if p]

def scrape_figma_shortcuts():
    print(f"Fetching shortcuts from {URL}...")
    response = requests.get(URL, headers=HEADERS)
    if response.status_code != 200:
        print(f"Error: Received status code {response.status_code}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    shortcuts = []
    
    # Iterate over shortcut categories and list items
    current_category = "General"
    
    for element in soup.find_all(['h2', 'h3', 'li', 'tr']):
        text = element.get_text(strip=True)
        
        # Update category context on headings
        if element.name in ['h2', 'h3']:
            current_category = text.replace("*", "").strip()
            continue
            
        # Parse shortcut row
        if " Copy" in text:
            parts = text.split(" 📋 Copy")[0].split(".")
            if len(parts) >= 2:
                description = parts[0].strip()
                keys_raw = parts[1].strip()
                keys = parse_key_combo(keys_raw)
                
                if description and keys:
                    shortcuts.append({
                        "keys": keys,
                        "description": description,
                        "category": current_category
                })

    # Save formatted JSON output
    output_path = "profiles/figma.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(shortcuts, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully scraped {len(shortcuts)} shortcuts to {output_path}!")

if __name__ == "__main__":
    scrape_figma_shortcuts()
