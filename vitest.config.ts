// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vitest/config'

/** Plugin-local vitest config: isolates tests from the harness repo's root config. */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
