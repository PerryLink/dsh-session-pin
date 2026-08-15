// SPDX-License-Identifier: Apache-2.0
/**
 * Row-slot adaptation: registers the per-row [pin][swatch] controls into the
 * upstream per-row slot (`sessions.row.action` — the D1 extension point,
 * declared by the workspace browser once it ships) when the running build
 * declares it, and stays inert on baselines without it (the DOM overlay
 * covers those). Session rows only: the upstream slot does not render on
 * workspace header rows, which the DOM overlay covers instead.
 *
 * The slot's owner currency is the upstream contract: one plain
 * `sessionId` per row (plus `blank` and the containing `workspaceId`), which
 * replaces title matching with the authoritative id. Because the key is
 * newer than the npm baseline this plugin compiles against, the registry is
 * consumed through a narrow structural face with boundary casts — runtime
 * probing, never compile-time dependence on the future key.
 * @module @dsh-external/dsh-session-pin/row-slot
 */
import * as React from 'react'
import type { PinReadFace, PinTranslate } from './faces.ts'
import { colorClassIndex } from './pin-core.ts'
import { BADGE_CLASS, PINNED_CLASS, PIN_SVG, ROW_CONTROLS_CLASS, SWATCH_CLASS } from './pin-ui-shared.ts'

/** Upstream row-slot key (the D1 extension point contract). */
export const ROW_SLOT_KEY = 'sessions.row.action'

/** Owner currency the upstream row slot passes to every entry. */
export interface RowSlotOwnerProps {
  /** The row's session id (authoritative anchor). */
  sessionId: string
  /** Whether the row is a blank (untitled) session. */
  blank: boolean
  /** Containing workspace account id, when grouped. */
  workspaceId?: string
}

/** Narrow registry face consumed through boundary casts (string keys). */
export interface RowSlotRegistryLike {
  inject(key: string, callback: () => () => void): () => void
  register(
    options: { name: string; id: string; order?: number; inject?: () => Record<string, unknown> },
    component: (props: never) => React.ReactNode,
  ): () => void
  snapshot(root: string): unknown[]
}

/** Row badge deps. */
export interface RowSlotDeps {
  slots: RowSlotRegistryLike
  pin: PinReadFace
  t: PinTranslate
}

type RowBadgeProps = RowSlotOwnerProps & { pin: PinReadFace; t: PinTranslate }

/** The color swatch: current color dot, click cycles, Shift+click clears. */
function RowSwatch(props: { color: string | undefined; pin: PinReadFace; id: string; t: PinTranslate }): React.ReactNode {
  const { color, pin, id, t } = props
  const index = colorClassIndex(color)
  const label = t('colorChange')
  return React.createElement('button', {
    type: 'button',
    className: SWATCH_CLASS,
    title: label,
    'aria-label': label,
    ...(index === undefined ? {} : { 'data-color': `c${index}` }),
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (event.shiftKey) void pin.clearColor(id)
      else void pin.cycleColor(id)
    },
  })
}

/** Per-row [pin][swatch] controls rendered inside the upstream row slot. */
function RowBadge(props: RowBadgeProps): React.ReactNode {
  const { sessionId, pin, t } = props
  const isPinned = React.useSyncExternalStore(pin.subscribe, () => pin.isPinned(sessionId))
  const color = React.useSyncExternalStore(pin.subscribe, () => pin.getColor(sessionId))
  const label = isPinned ? t('unpin') : t('pin')
  return React.createElement('span', { className: ROW_CONTROLS_CLASS },
    React.createElement('button', {
      type: 'button',
      className: `${BADGE_CLASS}${isPinned ? ` ${PINNED_CLASS}` : ''}`,
      title: label,
      'aria-label': label,
      'aria-pressed': isPinned,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        void pin.toggle(sessionId)
      },
    }, React.createElement('span', { dangerouslySetInnerHTML: { __html: PIN_SVG } })),
    React.createElement(RowSwatch, { color, pin, id: sessionId, t }),
  )
}

/** Whether the running build declares the upstream row slot. */
export function rowSlotDeclared(slots: RowSlotRegistryLike): boolean {
  return slots.snapshot(ROW_SLOT_KEY).length > 0
}

/**
 * Register the controls into the row slot when the build declares it. The
 * registration waits through `inject` (the callback runs on declaration);
 * on baselines without the slot the disposer stays a pending wait, cancelled
 * by plugin unload. The overlay recognizes any non-owned badge inside a
 * session row (the render site may wrap it) and retires its own, so a row
 * never shows two pin sets — and once the slot declares, the overlay stops
 * painting session rows entirely (see the slot-active gate in the glue).
 * @param deps - slot registry + pin/t faces.
 * @returns the disposer.
 */
export function mountRowSlot(deps: RowSlotDeps): () => void {
  return deps.slots.inject(ROW_SLOT_KEY, () => deps.slots.register(
    {
      name: ROW_SLOT_KEY,
      id: 'dsh-session-pin',
      order: 50,
      inject: () => ({ pin: deps.pin, t: deps.t }),
    },
    ((props: never) => RowBadge(props as unknown as RowBadgeProps)) as (props: never) => React.ReactNode,
  ))
}
