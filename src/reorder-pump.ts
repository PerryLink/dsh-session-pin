// SPDX-License-Identifier: Apache-2.0
/**
 * Reorder pump: the re-entrancy guard in front of the browser half's
 * pinned-prefix re-assertion.
 *
 * The glue re-asserts pinned order on every list change, and every reorder it
 * issues comes back as a list change — the host broadcasts the persisted order,
 * and the sidebar churns on unrelated session activity too. `reorderMoves`
 * plans its moves for SEQUENTIAL application (oldest pin first, so repeated
 * insert-before-the-current-head calls end with the newest pin first), but the
 * glue issued the batch concurrently, so every move computed its anchor from
 * the same pre-move snapshot. With three or more pinned sessions in one account
 * the resulting order is not the pinned prefix, the next event plans the same
 * moves again, and the client never stops POSTing
 * `workspace/insertSessionBefore` — issue #4: tens of thousands of requests
 * until `net::ERR_INSUFFICIENT_RESOURCES`.
 *
 * The pump gives the re-assertion three properties:
 *
 * 1. **One pass at a time.** A trigger that lands while a pass is running is
 *    coalesced into a single re-check after it settles, so the echo of this
 *    client's own confirmed move cannot re-enter the reorder path.
 * 2. **Sequential moves.** The plan is applied one move at a time, each move
 *    re-reading the live order — the contract the plan is built for.
 * 3. **One issuance per observed order.** A plan is issued at most once for a
 *    given observed order: replaying the same request sequence against the same
 *    order cannot change that order, which is exactly the loop. A real order
 *    change re-arms issuance, and so does {@link ReorderPump.reset} on a
 *    transport reconnect.
 * @module dsh-session-pin/reorder-pump
 */

/** One planned re-assertion: an entity whose list front must change. */
export interface ReorderMove {
  /** Which ordered list the move targets. */
  kind: 'session' | 'workspace'
  /** Entity id to move to the front of its ordered list. */
  id: string
}

/** One read of the observed order plus the moves that order still needs. */
export interface ReorderPlan {
  /**
   * Signature of the observed order. It must change whenever any observed list
   * order changes: the pump re-arms issuance on a new signature and suppresses
   * a repeated plan for an unchanged one.
   */
  orderKey: string
  /** Moves the observed order still needs, in application order. */
  moves: readonly ReorderMove[]
}

/** Narrow faces the pump drives (the browser glue owns both). */
export interface ReorderPumpDeps {
  /** Read the observed order and the moves it still needs. */
  plan(): ReorderPlan
  /**
   * Apply one move. The glue logs its own rejections; a rejection surfaces
   * through {@link ReorderPumpDeps.onError} and ends the pass.
   * @param move - the planned move.
   */
  apply(move: ReorderMove): Promise<void>
  /** Report a failed pass. The pump never throws into its caller. */
  onError?(error: unknown): void
}

/** The pump face. */
export interface ReorderPump {
  /** Request a re-assertion pass; coalesced while one is already running. */
  request(): void
  /** Forget the last issued plan (a transport reconnect re-arms re-assertion). */
  reset(): void
}

/** The last issued plan, keyed by the observed order it was planned from. */
interface IssuedPlan {
  orderKey: string
  planKey: string
}

/**
 * Create a pump over one plan source and one move applier.
 * @param deps - plan source, move applier, and error sink.
 * @returns the pump.
 */
export function createReorderPump(deps: ReorderPumpDeps): ReorderPump {
  let running = false
  let pending = false
  let scheduled = false
  let issued: IssuedPlan | undefined

  const pass = async (): Promise<void> => {
    const { orderKey, moves } = deps.plan()
    if (moves.length === 0) return
    const planKey = moves.map(move => `${move.kind}:${move.id}`).join('\u0000')
    if (issued !== undefined && issued.orderKey === orderKey && issued.planKey === planKey) return
    // Recorded before applying: replaying a plan against an unchanged observed
    // order cannot change that order, and that replay is the reported storm.
    issued = { orderKey, planKey }
    for (const move of moves) await deps.apply(move)
  }

  const run = async (): Promise<void> => {
    if (running) {
      pending = true
      return
    }
    running = true
    try {
      do {
        pending = false
        await pass()
      } while (pending)
    } catch (error: unknown) {
      deps.onError?.(error)
    } finally {
      running = false
    }
  }

  return {
    request(): void {
      if (running) {
        pending = true
        return
      }
      if (scheduled) return
      // One microtask hop, so a reapply pair (sessions then workspaces) and
      // every list change of the same tick collapse into a single pass.
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        void run()
      })
    },
    reset(): void {
      issued = undefined
    },
  }
}
