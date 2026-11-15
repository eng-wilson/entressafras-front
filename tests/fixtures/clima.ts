import type { Page } from '@playwright/test'
import { climaDeMock } from '../../src/data/climaFixture'
export const CLIMA_T07 = climaDeMock()
export async function comClimaFixo(page: Page) {
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
}
