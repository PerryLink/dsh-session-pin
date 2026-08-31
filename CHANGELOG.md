# Changelog


## [Unreleased]

### Changed

- Align devDeps pins to the published dsh 0.1.2-alpha.2 line (0.1.1-rc.2 -> 0.1.2-alpha.2); no behavior change to envelope/gating semantics.
All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.7.0] - 2026-08-30

### Changed

- **Pre-flight `session/pin` append gate** (`src/pin-log.ts`): `PinLogAppender` now probes the host's ability to carry the `session/pin` event BEFORE the first write instead of appending first and probing the returned envelope after. A host can carry the event only when its known event vocabulary (`KNOWN_SESSION_EVENT_TYPES`) covers the type or its append implementation still stamps the `ignorable` envelope marker (source-probed and cached per process). On hosts where neither holds 鈥?`0.1.2-alpha.1` removed the envelope and its read path fails closed on unknown types 鈥?no append is ever written (the previous write-then-probe order poisoned the log on first use) and the projection degrades to the settings cache with a one-time warning. `allowUnmarked` keeps the dangerous opt-in; `isMarkedIgnorable` remains exported for result-envelope probing.
- **Client seam migration off `@deepseek-ai/dsh-client-runtime`** (removed from current hosts): `src/client.ts` now reads the `SessionId`/`WorkspaceId` brands from `@deepseek-ai/dsh-client-connection/client`, and `src/ui.ts` types the session-header standard-kit seats (`sessionId`, `useProjection`) as a local structural contract instead of importing the removed package's merge. `dsh.client.inject` migrates from `@deepseek-ai/dsh-client-runtime` to the surviving client rows (`dsh-client-connection`, `dsh-client-ui-conversation`, `dsh-client-ui-sidebar`, `dsh-client-ui-layout`, `dsh-client-ui-settings`); peer ranges follow the family baseline and the optional-peer table mirrors the new list.
- **Row-slot degrade verified on `0.1.2-alpha.1`**: host HEAD declares no `sessions.row.action` slot (grep-verified), so the row-slot registration stays deferred through `slots.inject` and session rows fall back to the DOM overlay 鈥?no throw, no duplicate pin sets. Covered by the new `tests/row-slot.test.ts`.

## [0.6.1] - 2026-08-27

### Fixed

- Declare the web-client inject packages (`@deepseek-ai/dsh-client-runtime`,
  `@deepseek-ai/dsh-client-ui-settings`) as optional peerDependencies so the
  bundle composition is explicit and standalone installs stay clean.

## [0.6.0] - 2026-08-26

### Added

- **Log-backed canonical pin residence** (`enableLogBacking`, default false): a new `src/pin-log.ts` module defines the `session/pin` structured event, the pure projection fold that rebuilds the canonical pin set from a session log, and the ignorable-gated append seam. When enabled, the host half folds live `session/event` pins back into the canonical set and mirrors the folded `pinned`/`colors` into the settings namespace as an idempotent cache 鈥?the session log is authoritative, and the settings namespace plus browser-local storage remain the compat/degradation path. Workspace pins, both color maps' workspace half, and organizer metadata stay plugin-local and never ride the session log.

### Changed

- **Toolchain metadata**: CI pins pnpm to the `packageManager` version (pnpm@11.7.0) and Renovate is enabled via the shared `dsh-plugin-kit` preset. No plugin behavior changed.

## [0.5.0] - 2026-08-23

### Added

- **Board/tag write UI**: the board chip row now creates, renames, and deletes boards and drag-reorders them (order persists per-browser), and every pinned panel row gains a manage button that assigns its board and edits its tags 鈥?closing the organizer's write-side gap (`PinController.createBoard`/`renameBoard`/`removeBoard`/`assignBoard`/`setTags` are now reachable from the GUI).
- **Collapsible board grouping**: the pinned panel groups its workspaces and sessions by board under collapsible headers (ungrouped pins last), driven by the new `groupPinnedByBoard`/`reorderBoards`/`suggestBoardId` pure helpers. Existing pins, colors, and the four pin surfaces are unchanged.

### Changed

- **Package standards**: declare `packageManager: pnpm@11.7.0` and `engines.node: ^22.19.0 || >=24.0.0` in `package.json` to match the compat workflow's toolchain and the ecosystem engine floor. Metadata only 鈥?no plugin behavior changed.

## [0.4.3] - 2026-08-22

### Changed

- **DeepSeek Harness rc.2 compatibility**: every `@deepseek-ai/dsh-*` development dependency moves from `0.1.0-rc.8` to the exact `0.1.1-rc.2`, and the workshop manifest, READMEs, compat workflow, and `minimumReleaseAgeExclude` declare `0.1.1-rc.2`. No plugin code changed 鈥?all gates (typecheck, unit tests, coverage, lint, readme sync, build, self-contained, artifacts) pass against the rc.2 family, and the bundle mounts in a real rc.2 headless profile completing a keyless mock-LLM round trip.

## [0.4.2] - 2026-08-21

### Changed

- **DeepSeek Harness rc.8 compatibility**: every `@deepseek-ai/dsh-*` development dependency moves from `0.1.0-rc.6` to the exact `0.1.0-rc.8`, the `dsh-settings` peer range widens to `>=0.1.0-rc.8 <0.2.0`, and the workshop manifest, READMEs, and compat workflow declare rc.8. No plugin code changed 鈥?all gates (typecheck, unit tests, coverage, lint, readme sync, build, self-contained, artifacts) pass against the rc.8 family, and the bundle mounts in a real rc.8 headless profile completing a keyless mock-LLM round trip.

## [0.4.1] - 2026-08-19

### Fixed

- **Client dictionaries survive hot-reload**: the browser half now holds the `locale.register` disposer on the locale inject scope's fiber (`ctx.effect`; the locale registry throws on a duplicate namespace). Disposing the client fiber unregisters the `session-pin` dictionaries; remounting re-registers cleanly instead of throwing the duplicate-namespace error. Regression covered by a dispose-and-remount client test against a duplicate-strict locale registry.

## [0.4.0] - 2026-08-16

### Added

- **Pin groups (boards)**: pins join named groups (`pin.createBoard` / `pin.assignBoard` / `pin.removeBoard`); the pinned panel shows board chips that filter to one group (plus "All"). Boards persist per-browser with the pins (store envelope v3; v1/v2 documents migrate forward).
- **Session tags & saved views**: entities carry up to 8 tags (鈮?4 chars); the panel's filter bar matches text (case-insensitive title substring) and tags, and any filter state saves as a named view (up to 20, one-click restore).
- **Session health summary**: each pinned session row shows a read-only, sanitized health line (`N msgs 路 you|ai 路 relative time`) derived from the public session snapshot 鈥?counts and directions only, never content, zero network.
- **`/goto <keyword>`**: a composer line starting with `/goto` plus Enter jumps to the matching session (unique hit opens, multiple hits list, no hit explains); the command line is never sent to the model.
- Five Config switches (`enableBoards` / `enableTags` / `enableViews` / `enableHealth` / `enableGoto`, default true) and matching settings-namespace fields; `src/navigator.ts` holds the pure organizer logic (boards/tags/views/filter/health/goto/sanitize) with unit coverage.

### Changed

- Pin, color, and the four pin surfaces are fully unchanged (0.3.x compatible); the store envelope moves v2 鈫?v3 with forward migration.
- Five-language READMEs: navigation-organizer section and the five new Config rows; test count updated to 87.

## [0.3.1] - 2026-08-16

### Added

- **Bundle manifest**: `package.json` now declares a complete `dsh.bundle` manifest (`cordis.patch.yml` shipped in `files`), so the plugin installs with one command 鈥?`dsh plugin --profile <profile> add dsh-session-pin` 鈥?instead of a manual `cordis.yml` row.
- **Plugin Family cross-links**: the READMEs (English / 涓枃) now link the full PerryLink DSH plugin family.

## [0.3.0] - 2026-08-15

### Added

- **Workspace-level pins**: workspace header rows get the same pin controls as session rows; pinning a workspace moves it to the front of the workspace list (`workspace.insertBefore`).
- **Row colors**: a swatch after each pin cycles an 8-color preset palette (Shift+click clears); colored rows get a left accent bar plus a translucent tint, per level (session / workspace), persisted in settings or the v2 `localStorage` envelope.
- **Duplicate-pin fix**: on builds declaring the upstream `sessions.row.action` slot, the DOM overlay skips session rows entirely 鈥?a row can never show two pin sets; the overlay now observes the document body instead of the first `role="tree"` container, and re-renders on slot-registry changes.
- **Pinned panel** now lists both levels (workspaces + sessions) with color dots; the footer count includes both.
- Storage envelope **v2** with automatic migration of v1 / legacy bare-array documents.
- CI workflow (`ci`: typecheck, test, build), issue forms, PR template, `SECURITY.md`.

### Changed

- `maxPins` now applies **per level** (sessions and workspaces each have their own budget).
- Overlay click handling is routed by row kind, so a session row whose title collides with a workspace label can never toggle a workspace pin.
- Runtime probes guard newer service methods (`slots.subscribe/snapshot`, `workspace.insertBefore/startSession`) so older baselines degrade gracefully.
- READMEs synchronized across all five languages (English is the source).
- **Package renamed to unscoped `dsh-session-pin`** ahead of the first publish: the `@dsh-external` npm scope belongs to a retired DSH-beta organization and cannot be published into by third parties (403 for non-members).

## [0.2.0] - 2026-08-14

### Added

- Lucide-style pin badge with hover reveal and pinned state.
- Live verification script (`scripts/verify-live.mjs`) driving a headless browser against a running `dsh web`.
- Five-language READMEs (English 路 涓枃 路 Espa帽ol 路 Portugu锚s 路 啶灌た啶ㄠ啶︵) with demo screenshots.

### Changed

- Exposed `package.json` as a subpath export; aligned persistence docs with the DSH wire allowlist.
- Relicensed to Apache-2.0.

## [0.1.0] - 2026-08-14

### Added

- Initial release: pin sessions in the DSH web sidebar with a hover pin badge, session-header toggle, pinned-sessions panel, durable `session-pin` settings namespace, and top ordering via `workspace.insertSessionBefore`.
