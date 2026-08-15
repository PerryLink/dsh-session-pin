// SPDX-License-Identifier: Apache-2.0
/**
 * Plugin copy: the `session-pin` locale namespace (dictionary keys merged
 * into the slot system's LocaleNamespaceMap so the typed `bind`/`register`
 * faces check every key), the zh/en dictionaries, and the English fallback
 * used when no locale service is mounted in the composition.
 * @module @dsh-external/dsh-session-pin/locales
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { PinKey } from './faces.ts'

/** Namespace owning this plugin's copy. */
export const LOCALE_NS = 'session-pin'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'session-pin': PinKey
  }
}

/** English dictionary (also the fallback translate and the zh-miss chain tail). */
export const ENGLISH: Record<PinKey, string> = {
  pin: 'Pin session',
  unpin: 'Unpin session',
  limit: 'Pin limit reached; unpin another session first',
  pinWorkspace: 'Pin workspace',
  unpinWorkspace: 'Unpin workspace',
  limitWorkspace: 'Workspace pin limit reached; unpin another workspace first',
  colorChange: 'Change row color (click to cycle, Shift+click to clear)',
  panelTitle: 'Pinned sessions',
  panelEmpty: 'Nothing pinned yet',
  panelSessions: 'Sessions',
  panelWorkspaces: 'Workspaces',
  footerTitle: 'Pinned sessions',
}

/** Complete zh/en dictionaries for the locale registry. */
export const LOCALE_DICTS: { zh: Record<PinKey, string>; en: Record<PinKey, string> } = {
  zh: {
    pin: '置顶会话',
    unpin: '取消置顶',
    limit: '已达置顶上限，请先取消其他会话',
    pinWorkspace: '置顶工作区',
    unpinWorkspace: '取消工作区置顶',
    limitWorkspace: '已达工作区置顶上限，请先取消其他工作区',
    colorChange: '更换行颜色（点击循环切换，Shift+点击清除）',
    panelTitle: '已置顶的会话',
    panelEmpty: '还没有置顶任何内容',
    panelSessions: '会话',
    panelWorkspaces: '工作区',
    footerTitle: '已置顶的会话',
  },
  en: ENGLISH,
}

/** English fallback translate (compositions without the locale service). */
export const fallbackTranslate: (key: PinKey) => string = key => ENGLISH[key]
