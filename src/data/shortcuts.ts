export interface ShortcutItem {
    keys: string[];
    description: string;
    category: string;
  }
  
  export type AppShortcutMap = Record<string, ShortcutItem[]>;
  
  export const SHORTCUT_DATABASE: AppShortcutMap = {
    Figma: [
      { keys: ["F"], description: "Frame Tool", category: "Tools" },
      { keys: ["R"], description: "Rectangle Tool", category: "Tools" },
      { keys: ["T"], description: "Text Tool", category: "Tools" },
      { keys: ["Cmd", "Option", "K"], description: "Create Component", category: "Components" },
      { keys: ["Option", "Cmd", "B"], description: "Detach Instance", category: "Components" },
      { keys: ["Shift", "A"], description: "Add Auto Layout", category: "Layout" },
      { keys: ["Option", "H"], description: "Align Horizontal Centers", category: "Alignment" },
      { keys: ["Option", "V"], description: "Align Vertical Centers", category: "Alignment" },
      { keys: ["Cmd", "G"], description: "Group Selection", category: "Layer Management" },
    ],
    "Visual Studio Code": [
      { keys: ["Cmd", "P"], description: "Quick Open File", category: "Navigation" },
      { keys: ["Cmd", "Shift", "P"], description: "Command Palette", category: "Navigation" },
      { keys: ["Option", "Z"], description: "Toggle Word Wrap", category: "View" },
      { keys: ["Cmd", "/"], description: "Toggle Line Comment", category: "Editing" },
      { keys: ["Cmd", "D"], description: "Add Selection to Next Find Match", category: "Editing" },
    ],
    Google_Chrome: [
      { keys: ["Cmd", "T"], description: "New Tab", category: "Tabs" },
      { keys: ["Cmd", "Shift", "T"], description: "Reopen Closed Tab", category: "Tabs" },
      { keys: ["Cmd", "L"], description: "Highlight Address Bar", category: "Navigation" },
    ],
  };