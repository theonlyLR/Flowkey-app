export interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const REMOTE_BASE_URL =
  "https://cdn.jsdelivr.net/gh/theonlyLR/Shortcuts@main/profiles";

const EMBEDDED_FALLBACKS: Record<string, ShortcutItem[]> = {
  figma: [
    { keys: ["V"], description: "Move Tool", category: "Tools" },
    { keys: ["F"], description: "Frame Tool", category: "Tools" },
    { keys: ["T"], description: "Text Tool", category: "Tools" },
    { keys: ["Shift", "A"], description: "Add Auto Layout", category: "Layout" },
    { keys: ["Option", "Cmd", "K"], description: "Create Component", category: "Layout" },
    { keys: ["Cmd", "G"], description: "Group Selection", category: "Layers" },
    { keys: ["Cmd", "Shift", "G"], description: "Ungroup Selection", category: "Layers" },
  ],
  visual_studio_code: [
    { keys: ["Cmd", "P"], description: "Quick Open File", category: "Navigation" },
    { keys: ["Cmd", "Shift", "P"], description: "Command Palette", category: "Navigation" },
    { keys: ["Cmd", "/"], description: "Toggle Line Comment", category: "Editing" },
  ],
};

export async function fetchShortcutsForApp(appName: string): Promise<ShortcutItem[]> {
  if (!appName) return [];

  const normalized = appName.toLowerCase().replace(/[\s_]+/g, "_");
  const cacheKey = `flowkey_cache_${normalized}`;

  try {
    const res = await fetch(`${REMOTE_BASE_URL}/${normalized}.json`, {
      cache: "no-cache",
    });
    if (res.ok) {
      const data: ShortcutItem[] = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn(`[FlowKey Remote Engine] Failed to fetch remote profile for ${appName}, attempting cache fallback.`);
  }

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("[FlowKey Remote Engine] Failed to parse local cache:", e);
    }
  }

  return EMBEDDED_FALLBACKS[normalized] || [];
}
