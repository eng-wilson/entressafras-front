import { test, expect, type Page } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { comClimaFixo } from './fixtures/clima'
import { comRotacoesFixas } from './fixtures/rotacoes'
import { ROTACOES_FIXTURE } from '../src/data/rotacoesFixture'

const painel = (page: Page) => page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
})

test('explica o risco e conecta comparação e fase à mesma rotação', async ({ page }, testInfo) => {
  await page.goto('/')
  const insp = painel(page)
  await expect(insp.getByRole('heading', { level: 2 })).toHaveText('Soja → milho safrinha')
  await expect(insp).not.toContainText('Por que ficou')
  await expect(insp.locator('.insp-provisional')).toContainText('sem cálculo para este talhão')
  await expect(insp.getByRole('img', { name: 'Milho safrinha: risco hídrico de 30%, Arriscado, valor provisório.' })).toBeVisible()
  await expect(insp.getByRole('img', { name: 'Soja: risco hídrico de 10%, Favorável, valor provisório.' })).toBeVisible()
  await expect(insp.locator('.insp-phase')).toContainText('Fase crítica')
  await expect(insp.locator('.insp-phase')).not.toContainText('30%')
  const impacto = insp.locator('summary').filter({ hasText: 'Por que esta fase importa?' })
  await impacto.click()
  await expect(insp.getByText(/Sem água, flores abortam/)).toBeVisible()
  await impacto.click()
  await page.screenshot({ path: testInfo.outputPath('inspector-desktop.png') })

  await insp.getByRole('button', { name: 'Comparar alternativas' }).click()
  const tabela = page.getByRole('table', { name: 'Comparação das rotações' })
  await expect(tabela).toBeVisible()
  await expect(tabela.getByRole('checkbox', { name: 'Mostrar Soja → Milho safrinha no mapa' })).toBeChecked()
  await expect(tabela.getByRole('checkbox', { name: 'Mostrar Soja → Milheto no mapa' })).toBeChecked()
  await expect(page.locator('#rotation-board')).toBeFocused()

  // O cursor está longe da fase. A ação deve voltar ao calendário e à fase
  // do milho, mesmo quando acionada a partir da comparação.
  await page.getByRole('slider').fill('0')
  await insp.getByRole('button', { name: 'Ver fase no calendário' }).click()
  await expect(tabela).toHaveCount(0)
  await expect(page.getByRole('slider')).toBeFocused()
  await expect(page.locator('.dec i.zc.zcur')).toHaveCount(1)
  await expect(page.locator('.fpill')).toContainText('Milho')
  await expect(insp.getByRole('heading', { level: 2 })).toHaveText('Soja → milho safrinha')

  await insp.locator('summary').filter({ hasText: 'Como interpretar o risco' }).click()
  await expect(insp).toContainText('30% das 10 safras da referência com perda acima de 20%')
  await expect(insp).toContainText('não é uma probabilidade de seca nessas datas')
})

test('catálogo abre a cultura pedida mesmo com cursor na outra safra', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('slider').fill('5') // soja
  await painel(page).locator('summary').filter({ hasText: 'Datas e requisitos' }).click()
  const abrir = painel(page).getByRole('button', { name: 'Consultar requisitos de Milho safrinha' })
  await abrir.click()
  const dialogo = page.getByRole('dialog', { name: 'Dados das culturas' })
  await expect(dialogo.getByRole('combobox')).toHaveValue('milho')
  await page.keyboard.press('Escape')
  await expect(abrir).toBeFocused()
})

test('uma safra sem risco não produz conclusão favorável', async ({ page }) => {
  const dados = structuredClone(ROTACOES_FIXTURE)
  dados.rotations[2].crops[1].crop.risk.risk_percentage = null
  await comRotacoesFixas(page, dados)
  await page.goto('/')
  const insp = painel(page)
  await expect(insp.getByRole('heading', { name: 'Faltam dados de risco' })).toBeVisible()
  await expect(insp).toContainText('O risco de Milho safrinha não foi informado')
  await expect(insp.getByRole('img', { name: 'Milho safrinha: risco não informado.' })).toBeVisible()
  await expect(insp.locator('.insp-risk-row.none .insp-risk-track > span')).toHaveCount(0)
  await expect(insp.getByRole('button', { name: 'Ver fase no calendário' })).toHaveCount(0)
})

test('opção favorável preserva o aviso provisório e não inventa fase crítica', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Soja depois sorgo\./ }).click()
  const insp = painel(page)
  await expect(insp.getByRole('heading', { name: 'Favorável no risco geral da API', exact: true })).toBeVisible()
  await expect(insp.locator('.insp-provisional')).toBeVisible()
  await expect(insp.getByRole('button', { name: 'Ver fase no calendário' })).toHaveCount(0)
  await expect(insp.locator('.insp-cycle-critical')).toHaveCount(0)
})

test('linha do ciclo navega pela cultura e mantém o intervalo crítico da API', async ({ page }) => {
  await page.goto('/')
  const insp = painel(page)
  await insp.getByRole('button', { name: /^Ver ciclo de Soja no calendário/ }).click()
  await expect(page.getByRole('slider')).toHaveValue('4')
  await insp.getByRole('button', { name: /^Ver ciclo de Milho safrinha no calendário/ }).click()
  await expect(page.locator('.dec i.zc.zcur')).toHaveCount(1)
  await expect(page.locator('.fpill')).toContainText('Milho')
  const risco = insp.locator('.insp-risk-track > span')
  const comprimentos = await risco.evaluateAll(es => es.map(el => el.getBoundingClientRect().width))
  expect(comprimentos[1] / comprimentos[0]).toBeCloseTo(3, 1)
})

test('risco calculado sem fase e sem clima mantém os limites explícitos', async ({ page }) => {
  const dados = structuredClone(ROTACOES_FIXTURE)
  dados.warnings = []
  for (const r of dados.rotations) {
    for (const { crop } of r.crops) {
      crop.risk.method = 'FAO56_SIMPLIFIED_KY'
      crop.risk.critical_stage = null
    }
  }
  await comRotacoesFixas(page, dados)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ status: 500, json: {} }))
  await page.goto('/')
  const insp = painel(page)
  await expect(insp).toContainText('A fase de maior déficit não foi informada')
  await expect(insp.locator('.insp-provisional')).toHaveCount(0)
  await expect(insp.getByRole('button', { name: 'Ver fase no calendário' })).toHaveCount(0)
  await insp.locator('summary').filter({ hasText: 'Origem e limites dos dados' }).click()
  await expect(insp).toContainText('Clima indisponível')
  await expect(insp).toContainText('Os dados de risco recebidos são exibidos sem estimativa adicional')
})

test('painel acessível em celular, tablet e texto ampliado', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('link', { name: 'Entender esta rotação e os próximos passos' }).click()
  const insp = painel(page)
  await expect(insp).toBeInViewport()
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    const limites = await insp.evaluate(el => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, viewport: innerWidth, content: el.scrollWidth, width: el.clientWidth }
    })
    expect(limites.left).toBeGreaterThanOrEqual(0)
    expect(limites.right).toBeLessThanOrEqual(limites.viewport)
    expect(limites.content).toBeLessThanOrEqual(limites.width + 1)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await insp.screenshot({ path: testInfo.outputPath('inspector-mobile.png') })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await insp.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await insp.getByRole('button', { name: 'Comparar alternativas' }).click()
  await expect(page.getByRole('table', { name: 'Comparação das rotações' })).toBeVisible()
  await expect(page.locator('#rotation-board')).toBeFocused()
})
