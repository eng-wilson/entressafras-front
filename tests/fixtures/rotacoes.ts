import type { Page } from '@playwright/test'
import { ROTACOES_FIXTURE } from '../../src/data/rotacoesFixture'

/** Rotações recomendadas fixas (resposta real reduzida da API): os testes não dependem do ranking MOCK do backend. */
export async function comRotacoesFixas(page: Page, corpo: unknown = ROTACOES_FIXTURE, status = 200) {
  await page.route(/\/api\/rotations\/recommendations/, r => r.fulfill({ status, json: corpo }))
}
