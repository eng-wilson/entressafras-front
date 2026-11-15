import { test, expect } from '@playwright/test'
import { TALHAO_T07, comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'

// Risco e fase crítica vêm só da API (fixture): milho safrinha 30% e algodão 40% são arriscados, na fase III.
test.beforeEach(async ({ page }) => {
  await comTalhaoSalvo(page, { ...TALHAO_T07, textura: 'arenoso' })
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
  await page.goto('/')
})

test('marca os períodos críticos nas barras e explica cada um', async ({ page }) => {
  const marcas = page.locator('.rlist .crit')
  await expect(marcas.first()).toBeVisible()
  await expect(marcas.first()).toHaveAttribute('aria-label', /^Período crítico\. .+: risco hídrico de \d+% \(API\), maior déficit de água nesta fase\. Ver na simulação\.$/)
  await expect(page.locator('.crit-lg')).toContainText('Período crítico')
})

test('selecionar uma rotação leva a simulação ao período que mais pesa no selo dela', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Arraste para simular um período' })
  const antes = await slider.inputValue()
  const milho = page.getByRole('button', { name: /^Soja depois milho safrinha\./ })
  await milho.click()
  await expect(milho).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.insp h2')).toHaveText('Soja → milho safrinha')
  const depois = await slider.inputValue()
  expect(depois).not.toBe(antes)
  // O talhão mostra a cultura da rotação selecionada naquele decêndio
  await expect(page.locator('.fpill')).toContainText('Milho')
  // Caiu na zona que mais pesa: o chip avisa; o detalhe (nível, motivo e problema da fase) só no hover
  const chip = page.locator('.fpill.fp-al')
  await expect(chip).toContainText('Período crítico')
  const tip = chip.locator('.fp-tip')
  await expect(tip).toBeHidden()
  await chip.hover()
  await expect(tip).toBeVisible()
  await expect(tip).toContainText(/^Arriscado · seca n/)
  await expect(page.locator('.dec i.zc.zcur')).toHaveCount(1)
  await expect(page.locator('.selnum')).toBeHidden()
  await expect(page.locator('.row.sel .tl-cur')).toBeVisible()
  const marca = page.locator('.row.sel .crit').first()
  await expect(marca).toHaveAttribute('aria-label', /^Período crítico\. Milho safrinha, /)
  await page.screenshot({ path: process.env.SHOT ?? 'test-results/periodos-criticos.png' })
})
