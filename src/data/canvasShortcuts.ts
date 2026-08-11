export interface ShortcutItem {
    keys: string[];
    description: string;
    category: string;
  }
  
  export const CANVAS_FALLBACKS: Record<string, ShortcutItem[]> = {
    figma: [
      { keys: ["V"], description: "Move Tool", category: "Tools" },
      { keys: ["K"], description: "Scale Tool", category: "Tools" },
      { keys: ["F"], description: "Frame Tool", category: "Tools" },
      { keys: ["Shift", "S"], description: "Section Tool", category: "Tools" },
      { keys: ["R"], description: "Rectangle Tool", category: "Tools" },
      { keys: ["O"], description: "Ellipse Tool", category: "Tools" },
      { keys: ["L"], description: "Line Tool", category: "Tools" },
      { keys: ["P"], description: "Pen Tool", category: "Tools" },
      { keys: ["Shift", "P"], description: "Pencil Tool", category: "Tools" },
      { keys: ["T"], description: "Text Tool", category: "Tools" },
      { keys: ["C"], description: "Add Comment", category: "Tools" },
      { keys: ["I"], description: "Eyedropper", category: "Tools" },
      { keys: ["H"], description: "Hand Tool", category: "Tools" },
    ],
    adobe_photoshop: [
      { keys: ["V"], description: "Move Tool", category: "Tools" },
      { keys: ["M"], description: "Marquee Tool", category: "Tools" },
      { keys: ["L"], description: "Lasso Tool", category: "Tools" },
      { keys: ["W"], description: "Quick Selection", category: "Tools" },
      { keys: ["C"], description: "Crop Tool", category: "Tools" },
      { keys: ["B"], description: "Brush Tool", category: "Tools" },
      { keys: ["E"], description: "Eraser Tool", category: "Tools" },
      { keys: ["P"], description: "Pen Tool", category: "Tools" },
    ],
    visual_studio_code: [
      { keys: ["Cmd", "P"], description: "Quick Open File", category: "Navigation" },
    ],
  };