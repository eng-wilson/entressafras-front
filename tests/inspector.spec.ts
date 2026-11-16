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
  // Esta rotação não tem momento de atenção: a seção fica oculta (só aparece quando há)
  await expect(insp.locator('.insp-rank-pill')).toBeVisible({ timeout: 30000 })
  await expect(insp.locator('section.attention-cycle')).toBeHidden()
  await expect(insp.locator('.insp-risk-chart, .insp-cycle-chart')).toHaveCount(0)
  await expect(page.getByRole('complementary', { name: 'Ajustes' }).getByRole('region', { name: 'Momentos de atenção da rotação' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('inspector-desktop.png') })

  // O cursor está longe da fase antes de ir à comparação.
  await page.getByRole('slider', { name: 'Arraste para simular um período' }).fill('0')
  await insp.getByRole('button', { name: 'Comparar alternativas' }).click()
  // Na comparação, as mesmas linhas do calendário com caixas para marcar o que comparar
  const tabela = page.getByRole('checkbox', { name: /^Comparar / })
  await expect(tabela).toHaveCount(4)
  await expect(page.getByRole('checkbox', { name: 'Comparar Soja depois milho safrinha' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Comparar Soja depois milheto' })).toBeChecked()
  await expect(page.locator('#rotation-board')).toBeFocused()
  // Na comparação, o calendário some: o período simulado não muda nada nela.
  await expect(page.getByRole('slider', { name: 'Arraste para simular um período' })).toHaveCount(0)

  // Tocar na safra arriscada leva ao período crítico dela no calendário, mesmo a partir da comparação;
  // embaixo do nome, o motivo em uma frase curta.
  const milho = insp.getByRole('button', { name: /^Ver a 2ª safra \(Milho safrinha\) no calendário/ })
  await expect(milho.locator('.insp-culture-why')).toHaveText(/^Falta de água em 45% das safras, sobretudo na fase de floração e enchimento de grãos\.$/)
  await milho.click()
  await expect(tabela).toHaveCount(0)
  await expect(page.getByRole('slider', { name: 'Arraste para simular um período' })).toBeFocused()
  await expect(page.locator('.dec i.zc.zcur')).toHaveCount(1)
  await expect(page.locator('.fpill')).toContainText('Milho')
  await expect(insp.getByRole('heading', { level: 2 })).toHaveText('Soja → milho safrinha')

  await insp.getByRole('button', { name: 'Como interpretar o risco' }).click()
  await expect(insp).toContainText('45% das 10 safras da referência com perda acima de 20%')
  await expect(insp).toContainText('não é uma probabilidade de seca nessas datas')
})

test('catálogo abre a cultura pedida mesmo com cursor na outra safra', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('slider', { name: 'Arraste para simular um período' }).fill('5') // soja
  await painel(page).getByRole('button', { name: 'Datas e requisitos' }).click()
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
  await insp.getByRole('button', { name: 'Datas e requisitos' }).click()
  await expect(insp.locator('.insp-status.none')).toHaveText('Sem dado')
  await expect(insp.locator('.insp-culture-why')).toHaveCount(0)
})

test('opção favorável preserva o aviso provisório e não inventa fase crítica', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Soja depois sorgo\./ }).click()
  const insp = painel(page)
  await expect(insp.getByRole('heading', { name: 'Favorável no risco geral da API', exact: true })).toBeVisible()
  await expect(insp.locator('.insp-provisional')).toBeVisible()
  // Safras favoráveis: sem motivo embaixo do nome
  await expect(insp.locator('.insp-culture-why')).toHaveCount(0)
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
  // O panorama vem do atendimento por fase da API, não do clima: a falha do clima não o apaga nem o substitui
  await expect(insp.locator('section.attention-cycle')).toBeHidden()
  await expect(insp.locator('.insp-provisional')).toHaveCount(0)
  // Sem fase crítica da API, o motivo fica só no risco
  await expect(insp.locator('.insp-culture-why')).toHaveText('Falta de água em 45% das safras históricas.')
  await insp.getByRole('button', { name: 'Origem e limites dos dados' }).click()
  await expect(insp).toContainText('Clima indisponível')
  await expect(insp).toContainText('Os dados de risco recebidos são exibidos sem estimativa adicional')
})

test('painel acessível em celular, tablet e texto ampliado', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('link', { name: 'Entender esta rotação e os próximos passos' }).click()
  const insp = painel(page)
  await expect(insp).toBeInViewport()
  await expect(insp.locator('.insp-rank-pill')).toBeVisible({ timeout: 30000 })
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
  await expect(page.getByRole('checkbox', { name: /^Comparar / }).first()).toBeVisible()
  await expect(page.locator('#rotation-board')).toBeFocused()
})
