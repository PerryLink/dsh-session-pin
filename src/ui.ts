// SPDX-License-Identifier: Apache-2.0
/**
 * Slot-based UI contributions of the browser half: the session-header pin
 * toggle (`conversation.session.header.actions` — the authoritative
 * per-session anchor, keyed by the framework-resolved sessionId, so duplicate
 * titles and blank sessions pin correctly), the sidebar foot action
 * (`sidebar.footer.action`) opening the pinned-sessions panel, and the panel
 * itself (`shell.overlay` — the additive frame-wide floating layer). The
 * panel lists both pin levels — pinned sessions and pinned workspaces —
 * newest pin first, with each row's color dot.
 *
 * Every entry renders through the shipped shell's slot outlets; no DOM
 * overlay exists here. Locale copy rides the plugin-owned `session-pin`
 * namespace (bound by the browser glue); compositions without the locale
 * service keep the English fallback.
 *
 * React arrives through the module-table seed word (`require('react')`), the
 * shell's own instance — the client bundle externalizes it, never a
 * duplicate.
 * @module dsh-session-pin/ui
 */
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ComposedProps } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only merges: SlotMap keys and the session standard kit.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type { PinReadFace, PinTranslate, PinUiState, SessionListFace, WorkspaceListFace } from './faces.ts'
import {
  FOOTER_CLASS, HEADER_CLASS, PANEL_CLASS, PANEL_DOT_CLASS, PANEL_ROW_CLASS, PANEL_SECTION_CLASS,
  PIN_SVG, PINNED_CLASS,
} from './pin-ui-shared.ts'

/** Open/close observable for the pinned-sessions panel. */
export function createPinUiState(): PinUiState {
  let open = false
  // Cached snapshot: useSyncExternalStore compares getSnapshot's return by
  // reference, so a fresh object per read would force a re-render loop.
  let snapshot = { open }
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setOpen(next) {
      if (next === open) return
      open = next
      snapshot = { open }
      notify()
    },
    toggle() {
      open = !open
      snapshot = { open }
      notify()
    },
  }
}

/** Session-header toggle share. */
interface HeaderInjected {
  pin: PinReadFace
  t: PinTranslate
}

type HeaderButtonProps = ComposedProps<'conversation.session.header.actions', string, never, undefined, HeaderInjected>

/** Projection-key read, crossed through the version boundary (the `pin` key
 * ships with the upstream session-pin package; the npm baseline lacks it). */
type PinProjectionRead = (key: string) => { pinned?: boolean; at?: number } | null | undefined

/**
 * Pin toggle in the session header's action row. The framework resolves the
 * sessionId from the session scope, so the toggle never depends on row DOM.
 * When the host serves the log-backed `pin` projection (upstream session-pin
 * package), it is the freshest truth — other browsers' commits arrive
 * through it — and the store membership is the fallback. The explicit
 * `setPinned` commit keeps the projection and the store converging.
 */
function PinHeaderButton(props: HeaderButtonProps): React.ReactNode {
  const { sessionId, useProjection, pin, t } = props
  const id = sessionId as string
  const readProjection = useProjection as unknown as PinProjectionRead
  const projected = readProjection('pin')
  const stored = React.useSyncExternalStore(
    pin.subscribe,
    () => pin.isPinned(id),
  )
  const isPinned = projected?.pinned ?? stored
  const label = isPinned ? t('unpin') : t('pin')
  return React.createElement('button', {
    type: 'button',
    className: `${HEADER_CLASS}${isPinned ? ` ${PINNED_CLASS}` : ''}`,
    title: label,
    'aria-label': label,
    'aria-pressed': isPinned,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      void pin.setPinned(id, !isPinned)
    },
  }, React.createElement('span', { dangerouslySetInnerHTML: { __html: PIN_SVG } }))
}

/** Sidebar foot action share. */
interface FooterInjected {
  pin: PinReadFace
  ui: PinUiState
  t: PinTranslate
}

type FooterActionProps = ComposedProps<'sidebar.footer.action', string, never, undefined, FooterInjected>

/**
 * Foot action beside Settings: opens the pinned-sessions panel. Wide mode
 * shows the label and the combined pin count; the rail shows the glyph only.
 */
function PinFooterAction(props: FooterActionProps): React.ReactNode {
  const { wide, pin, ui, t } = props
  const count = React.useSyncExternalStore(pin.subscribe, () =>
    pin.getPinned().length + pin.getWorkspacePinned().length)
  const open = React.useSyncExternalStore(ui.subscribe, () => ui.getSnapshot().open)
  const label = t('footerTitle')
  return React.createElement('button', {
    type: 'button',
    className: FOOTER_CLASS,
    title: label,
    'aria-label': label,
    'aria-pressed': open,
    onClick: () => {
      ui.toggle()
    },
  },
    React.createElement('span', { dangerouslySetInnerHTML: { __html: PIN_SVG } }),
    wide ? React.createElement('span', null, count > 0 ? `${label} (${count})` : label) : null,
  )
}

/** Panel share. */
interface PanelInjected {
  pin: PinReadFace
  ui: PinUiState
  sessions: SessionListFace
  workspaces: WorkspaceListFace
  t: PinTranslate
  openSession: (id: string) => void
  openWorkspace: (id: string) => void
}

type PanelProps = ComposedProps<'shell.overlay', string, never, undefined, PanelInjected>

/** One panel row: pin glyph, color dot, title; click opens and closes the panel.
 *  Navigator attributes (id/title/tags/board) let the nav bar filter and
 *  annotate rows without entering React's tree. */
function panelRow(
  key: string,
  title: string,
  color: string | undefined,
  onClick: () => void,
  navigator?: { id: string; tags: readonly string[]; boardId?: string; sessionId?: string },
): React.ReactNode {
  return React.createElement('div', {
    key,
    className: PANEL_ROW_CLASS,
    role: 'button',
    tabIndex: 0,
    title,
    ...navigator === undefined ? {} : {
      'data-id': navigator.id,
      'data-title': title,
      'data-tags': navigator.tags.join(' '),
      ...navigator.boardId === undefined ? {} : { 'data-board': navigator.boardId },
      ...navigator.sessionId === undefined ? {} : { 'data-session-id': navigator.sessionId },
    },
    onClick,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onClick()
    },
  },
    React.createElement('span', { dangerouslySetInnerHTML: { __html: PIN_SVG } }),
    React.createElement('span', { className: PANEL_DOT_CLASS, ...(color === undefined ? {} : { style: { background: color, borderColor: color } }) }),
    React.createElement('span', null, title),
  )
}

/**
 * The pinned-sessions panel: pinned sessions and pinned workspaces in pin
 * order, newest first; clicking one opens it (and closes the panel). Escape
 * or a click outside closes it; empty state shows the placeholder copy.
 */
function PinPanel(props: PanelProps): React.ReactNode {
  const { pin, ui, sessions, workspaces, t, openSession, openWorkspace } = props
  const open = React.useSyncExternalStore(ui.subscribe, () => ui.getSnapshot().open)
  const pinned = React.useSyncExternalStore(pin.subscribe, () => pin.getPinned())
  const workspacePinned = React.useSyncExternalStore(pin.subscribe, () => pin.getWorkspacePinned())
  const list = React.useSyncExternalStore(sessions.subscribe, () => sessions.getSnapshot())
  const workspaceList = React.useSyncExternalStore(workspaces.subscribe, () => workspaces.getSnapshot())
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') ui.setOpen(false)
    }
    const onClick = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Node && panelRef.current?.contains(target)) return
      ui.setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
    }
  }, [open, ui])

  if (!open) return null
  const rows: React.ReactNode[] = []
  const boards = pin.getBoards()
  const tags = pin.getTags()
  const navFor = (id: string, sessionId?: string) => ({
    id,
    tags: tags[id] ?? [],
    ...boards.membership[id] === undefined ? {} : { boardId: boards.membership[id] },
    ...sessionId === undefined ? {} : { sessionId },
  })
  if (workspacePinned.length > 0) {
    rows.push(React.createElement('div', { key: '__ws-head__', className: PANEL_SECTION_CLASS }, t('panelWorkspaces')))
    const byId = new Map(workspaceList.items.map(item => [item.workspaceId, item.title]))
    for (const id of workspacePinned) {
      const title = byId.get(id) ?? id
      rows.push(panelRow(`w:${id}`, title, pin.getWorkspaceColor(id), () => {
        openWorkspace(id)
        ui.setOpen(false)
      }, navFor(id)))
    }
  }
  if (pinned.length > 0) {
    rows.push(React.createElement('div', { key: '__s-head__', className: PANEL_SECTION_CLASS }, t('panelSessions')))
    for (const id of pinned) {
      const title = list.byId[id]?.displayTitle ?? id
      rows.push(panelRow(`s:${id}`, title, pin.getColor(id), () => {
        openSession(id)
        ui.setOpen(false)
      }, navFor(id, id)))
    }
  }
  if (rows.length === 0) {
    rows.push(React.createElement('div', { key: '__empty__', className: PANEL_ROW_CLASS }, t('panelEmpty')))
  }
  return React.createElement('div', {
    ref: panelRef,
    className: PANEL_CLASS,
    role: 'dialog',
    'aria-label': t('panelTitle'),
  }, rows)
}

/** Dependencies of the slot registrations (glue supplies the runtime faces). */
export interface RegisterSlotsDeps {
  ctx: Pick<Context, 'slots'>
  pin: PinReadFace
  ui: PinUiState
  sessions: SessionListFace
  workspaces: WorkspaceListFace
  t: PinTranslate
  openSession: (id: string) => void
  openWorkspace: (id: string) => void
}

/**
 * Register the three slot contributions. `ctx.slots.inject` defers each
 * registration until the owning shell declares the slot, so minimal shells
 * without the conversation header, sidebar foot, or overlay simply never
 * mount the entries — no load failure, no throw.
 * @param deps - runtime faces plus the slot registry.
 * @returns the combined disposer (also fiber-bound through the registry).
 */
export function registerSlots(deps: RegisterSlotsDeps): () => void {
  const { ctx, pin, ui, sessions, workspaces, t, openSession, openWorkspace } = deps
  const disposers: Array<() => void> = []

  disposers.push(ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    {
      name: 'conversation.session.header.actions',
      id: 'dsh-session-pin',
      order: 50,
      inject: () => ({ pin, t }),
    },
    PinHeaderButton,
  )))

  disposers.push(ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    {
      name: 'sidebar.footer.action',
      id: 'dsh-session-pin',
      order: 50,
      inject: () => ({ pin, ui, t }),
    },
    PinFooterAction,
  )))

  disposers.push(ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    {
      name: 'shell.overlay',
      id: 'dsh-session-pin-panel',
      order: 50,
      inject: () => ({ pin, ui, sessions, workspaces, t, openSession, openWorkspace }),
    },
    PinPanel,
  )))

  return () => {
    for (const dispose of disposers.splice(0)) dispose()
  }
}
