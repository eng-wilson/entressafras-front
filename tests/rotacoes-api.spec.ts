import { test, expect } from '@playwright/test'
import { TALHAO_T07, comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'
import { ROTACOES_FIXTURE } from '../src/data/rotacoesFixture'

type Corpo = { location: unknown; soil_type?: string; crop_history?: number[]; priorities: Record<string, number> }

/** Responde a fixture; com "produtividade" ligada sozinha, inverte a ordem (como faria o ranking da API). */
async function comApiDeRotacoes(page: import('@playwright/test').Page, pedidos: Corpo[]) {
  await page.route(/\/api\/rotations\/recommendations/, r => {
    const corpo = r.request().postDataJSON() as Corpo
    pedidos.push(corpo)
    const resp = structuredClone(ROTACOES_FIXTURE)
    resp.priorities = corpo.priorities as typeof resp.priorities
    if (corpo.priorities.productivity && !corpo.priorities.water_security) {
      resp.rotations.reverse().forEach((x, i) => { x.rank = i + 1 })
    }
    return r.fulfill({ json: resp })
  })
}

test('envia solo, histórico e prioridades; ligar uma prioridade reordena pela API e mantém a seleção', async ({ page }) => {
  const pedidos: Corpo[] = []
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
  await comApiDeRotacoes(page, pedidos)
  await page.goto('/')

  const nomes = page.locator('.rlist .nm-b')
  await expect(nomes.first()).toContainText('milheto')
  // T-07: argiloso informado, histórico soja → milho; padrão da lateral: resiliência e solo ligados
  expect(pedidos[0]).toMatchObject({
    soil_type: 'clayey', crop_history: [1150, 2175],
    priorities: { water_security: 1, productivity: 0, soil_protection: 1 },
  })

  const sorgo = page.getByRole('button', { name: /^Soja depois sorgo\./ })
  await sorgo.click()
  await expect(page.locator('.insp h2')).toHaveText('Soja → sorgo')

  await page.getByRole('switch', { name: 'Resiliência climática' }).click()
  await page.getByRole('switch', { name: 'Saúde do solo' }).click()
  await page.getByRole('switch', { name: 'Produtividade' }).click()
  await expect(nomes.first()).toContainText('algodão')
  expect(pedidos.at(-1)!.priorities).toEqual({ water_security: 0, productivity: 1, soil_protection: 0 })
  // A rotação selecionada continua a mesma, agora em outra posição
  await expect(page.locator('.insp h2')).toHaveText('Soja → sorgo')
  await expect(page.getByRole('button', { name: /^Soja depois sorgo\./ })).toHaveAttribute('aria-pressed', 'true')
})

test('sem textura informada, não manda solo e a lateral mostra o solo estimado pela API', async ({ page }) => {
  const pedidos: Corpo[] = []
  await comTalhaoSalvo(page, { ...TALHAO_T07, textura: null, texturaInformada: false })
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
  await page.route(/\/api\/rotations\/recommendations/, r => {
    pedidos.push(r.request().postDataJSON() as Corpo)
    const resp = structuredClone(ROTACOES_FIXTURE)
    resp.soil = { ...resp.soil, source: 'SOILGRIDS_SAXTON_RAWLS_2006', texture_class: 'clayey', available_water_mm_per_m: 128, distance_km: 0.2 }
    return r.fulfill({ json: resp })
  })
  await page.goto('/')
  await expect(page.locator('.rlist .nm-b').first()).toBeVisible()
  expect(pedidos[0].soil_type).toBeUndefined()
  await expect(page.locator('.side')).toContainText('Argiloso (estimado)')
})

test('comparação: consumo do ciclo calculado com a API no lugar da faixa ilustrativa; solo superficial do SoilGrids na memória', async ({ page }) => {
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
  await page.route(/\/api\/rotations\/recommendations/, r => {
    const resp = structuredClone(ROTACOES_FIXTURE)
    resp.soil_properties = {
      source: 'SoilGrids', depth: '0–30 cm', organic_carbon_g_per_kg: 14.2,
      sand_pct: 31.5, silt_pct: 16.5, clay_pct: 52, texture_class: 'clayey',
      sampled_location: { lat: -12.54, lon: -55.72 }, distance_km: 0.2,
    }
    return r.fulfill({ json: resp })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comparação' }).click()
  const celulas = page.locator('.ctab .ct-wn')
  await expect(celulas.first()).toHaveText(/^~\d+ mm$/)
  await expect(page.locator('.ctab')).not.toContainText('450–800')

  await page.getByRole('button', { name: 'Por safra' }).first().click()
  await page.getByRole('button', { name: 'De onde vêm estes números' }).first().click()
  const memoria = page.getByRole('dialog', { name: /^De onde vêm os números/ })
  // Só campos da API, cada um com o caminho de origem (visível em desenvolvimento, ou ligando "Campos da API")
  await expect(memoria).toContainText('Solo superficial (só exibição)')
  await expect(memoria.getByRole('row', { name: /Carbono orgânico/ })).toContainText('14,2 g/kg')
  await expect(memoria).toContainText('organic_carbon_g_per_kg = 14.2')
  await expect(memoria).toContainText('.crop.risk')
  await expect(memoria).not.toContainText('Kc × ET0')
  await memoria.getByLabel('Campos da API').uncheck()
  await expect(memoria).not.toContainText('organic_carbon_g_per_kg')
})
