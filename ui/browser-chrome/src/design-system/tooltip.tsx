import type { ReactNode } from 'react';

// Hover labels use the platform's native help tags (the `title` attribute):
// on macOS Chromium shows a real NSView tooltip with the system delay, font
// and placement, on Windows the native tooltip. This replaces the Figma dark
// label (30:122), which read as a web component (docs/ux-audit.md).
// Keyboard and VoiceOver users get the same text from the accessible name.
export function TooltipLayer({ children }: { children: ReactNode }) { return <>{children}</>; }

/** Props that attach a native help tag. `placement` is accepted for API compatibility. */
export function useTooltip(text: string, _placement?: 'below' | 'above') { return { title: text }; }
