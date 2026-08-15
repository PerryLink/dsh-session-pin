// SPDX-License-Identifier: Apache-2.0
/**
 * Plugin-owned UI constants: badge/control class names (hashed core CSS never
 * shares them), the shared pushpin glyph, the color-swatch classes, and the
 * one injected stylesheet covering the row badges, the swatch button, the
 * per-color row tint, the session-header toggle, the sidebar foot action,
 * and the overlay panel.
 * @module @dsh-external/dsh-session-pin/pin-ui-shared
 */
import { hexToRgba, PIN_COLOR_PALETTE } from './pin-core.ts'

/** Row badge classes (DOM overlay). */
export const BADGE_CLASS = '__dsh-session-pin-badge__'
/** Pinned-state class shared by every plugin control. */
export const PINNED_CLASS = '__dsh-session-pin-pinned__'
/** Session-header toggle button. */
export const HEADER_CLASS = '__dsh-session-pin-header__'
/** Sidebar foot action. */
export const FOOTER_CLASS = '__dsh-session-pin-footer__'
/** Overlay panel root. */
export const PANEL_CLASS = '__dsh-session-pin-panel__'
/** Overlay panel row (one pinned session/workspace). */
export const PANEL_ROW_CLASS = '__dsh-session-pin-panel-row__'
/** Overlay panel section heading. */
export const PANEL_SECTION_CLASS = '__dsh-session-pin-panel-section__'
/** Overlay panel row color dot. */
export const PANEL_DOT_CLASS = '__dsh-session-pin-panel-dot__'
/** Row-level controls wrapper ([pin][swatch]) stamped by both render paths. */
export const ROW_CONTROLS_CLASS = '__dsh-session-pin-row-controls__'
/** Color-swatch button rendered after the pin badge. */
export const SWATCH_CLASS = '__dsh-session-pin-swatch__'

/** Inline pushpin glyph — Lucide-style stroke icon (currentColor). */
export const PIN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>'

const CONTROL_STYLE = [
  'all:unset;display:inline-flex;align-items:center;justify-content:center;',
  'cursor:pointer;border-radius:4px;color:#8b949e;',
  'transition:color 120ms ease,background-color 120ms ease;',
  'box-sizing:border-box;flex:none;',
].join('')

/**
 * Per-color row tint rules: the row containing a swatch with `data-color` gets
 * a left accent bar plus a translucent background tint. Session rows carry
 * `aria-selected`, workspace rows carry `aria-expanded` — the two selectors
 * never overlap.
 */
function tintRules(): string[] {
  const rules: string[] = []
  PIN_COLOR_PALETTE.forEach((color, index) => {
    const body = `background-color:${hexToRgba(color, 0.1)};box-shadow:inset 3px 0 0 ${color};`
    rules.push(`[role="treeitem"][aria-selected]:has(button.${SWATCH_CLASS}[data-color="c${index}"]){${body}}`)
    rules.push(`[role="treeitem"][aria-expanded]:has(button.${SWATCH_CLASS}[data-color="c${index}"]){${body}}`)
    rules.push(`button.${SWATCH_CLASS}[data-color="c${index}"]::after{background-color:${color};border-color:${color};}`)
  })
  return rules
}

/** One injected stylesheet for every plugin-owned surface. */
export const STYLE_TEXT = [
  // Row controls wrapper: the [pin][swatch] pair, hidden until row hover /
  // pinned / colored / keyboard focus.
  `span.${ROW_CONTROLS_CLASS}{display:inline-flex;align-items:center;gap:2px;margin-right:4px;flex:none;}`,
  `button.${BADGE_CLASS}{`,
  CONTROL_STYLE,
  'width:16px;height:16px;opacity:0;',
  'transition:opacity 80ms ease,color 120ms ease,background-color 120ms ease;',
  '}',
  `button.${SWATCH_CLASS}{`,
  CONTROL_STYLE,
  'width:16px;height:16px;opacity:0;position:relative;',
  'transition:opacity 80ms ease,color 120ms ease,background-color 120ms ease;',
  '}',
  `button.${SWATCH_CLASS}::after{`,
  'content:"";position:absolute;width:9px;height:9px;border-radius:50%;',
  'border:1.5px solid currentColor;background-color:transparent;',
  '}',
  `[role="treeitem"]:hover button.${BADGE_CLASS},`,
  `[role="treeitem"]:hover button.${SWATCH_CLASS},`,
  `button.${BADGE_CLASS}.${PINNED_CLASS},`,
  `button.${BADGE_CLASS}:focus-visible,`,
  `button.${SWATCH_CLASS}:focus-visible,`,
  `button.${SWATCH_CLASS}[data-color]{opacity:1;}`,
  `button.${BADGE_CLASS}:hover{color:#57606a;background-color:rgba(140,149,159,.12);}`,
  `button.${SWATCH_CLASS}:hover{color:#57606a;background-color:rgba(140,149,159,.12);}`,
  `button.${BADGE_CLASS}.${PINNED_CLASS}{color:#eab308;}`,
  `button.${BADGE_CLASS}.${PINNED_CLASS}:hover{color:#fbbf24;background-color:rgba(234,179,8,.12);}`,
  ...tintRules(),
  // Session-header toggle: always visible, amber while pinned.
  `button.${HEADER_CLASS}{`,
  CONTROL_STYLE,
  'width:24px;height:24px;',
  '}',
  `button.${HEADER_CLASS}:hover{color:#57606a;background-color:rgba(140,149,159,.12);}`,
  `button.${HEADER_CLASS}:focus-visible{outline:2px solid #3884ff;outline-offset:1px;}`,
  `button.${HEADER_CLASS}.${PINNED_CLASS}{color:#eab308;background-color:rgba(234,179,8,.12);}`,
  // Sidebar foot action.
  `button.${FOOTER_CLASS}{`,
  CONTROL_STYLE,
  'gap:6px;width:100%;height:28px;padding:0 8px;font-size:12px;',
  '}',
  `button.${FOOTER_CLASS}:hover{color:#57606a;background-color:rgba(140,149,159,.12);}`,
  `button.${FOOTER_CLASS}:focus-visible{outline:2px solid #3884ff;outline-offset:1px;}`,
  // Overlay panel: floats over the frame; opts back into pointer events.
  `div.${PANEL_CLASS}{`,
  'position:fixed;top:48px;right:12px;width:280px;max-height:60vh;overflow:auto;',
  'background:#1f2428;border:1px solid #30363d;border-radius:8px;',
  'box-shadow:0 8px 24px rgba(0,0,0,.4);padding:8px;pointer-events:auto;',
  'color:#e6edf3;font-size:13px;z-index:1000;',
  '}',
  `div.${PANEL_SECTION_CLASS}{`,
  'padding:4px 8px 2px;font-size:11px;letter-spacing:.4px;color:#8b949e;',
  'text-transform:uppercase;',
  '}',
  `div.${PANEL_ROW_CLASS}{`,
  'display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;',
  'cursor:pointer;',
  '}',
  `div.${PANEL_ROW_CLASS}:hover{background:rgba(140,149,159,.12);}`,
  `span.${PANEL_DOT_CLASS}{width:9px;height:9px;border-radius:50%;flex:none;`,
  'border:1.5px solid #8b949e;background-color:transparent;',
  '}',
].join('')
