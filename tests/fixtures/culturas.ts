import type { Page } from '@playwright/test'
import { CULTURAS_FIXTURE } from '../../src/data/culturasFixture'

export async function comCulturasFixas(page: Page) {
  await page.route(/\/api\/crops(?:\/\d+)?(?:\?|$)/, r => {
    const url = new URL(r.request().url())
    const codigo = url.pathname.match(/\/crops\/(\d+)$/)?.[1]
    if (codigo) {
      const dados = CULTURAS_FIXTURE.find(c => c.eco_port_code === Number(codigo))
      return r.fulfill({ status: dados ? 200 : 404, json: dados ?? {} })
    }
    const q = url.searchParams.get('q') ?? ''
    const items = CULTURAS_FIXTURE.filter(c => c.scientific_name.includes(q)).map(c => ({
      eco_port_code: c.eco_port_code, scientific_name: c.scientific_name, common_names: [], category: [], life_span: [],
    }))
    return r.fulfill({ json: { total: items.length, limit: 100, offset: 0, items } })
  })
}
