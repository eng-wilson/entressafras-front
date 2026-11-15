import { test, expect } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  // Cenário de teste seco: o risco MOCK da API continua favorável no milheto,
  // mas o motor local deve detectar a restrição, sem consultar a tabela WAT2.
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: {
    ...CLIMA_T07, decendios: CLIMA_T07.decendios.map(d => ({ ...d, chuva_media: 0, chuva_p20: 0 })),
  } }))
})

test('rotação favorável tem momentos locais com resposta, ação e o mesmo estado na cena', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Soja depois milheto\./ }).click()
  const painel = page.getByRole('region', { name: 'Momentos de atenção da rotação' })
  await expect(painel.locator('.attention-map')).toBeVisible({ timeout: 30000 })
  await expect(painel.locator('.attention-overall')).toContainText('API: favorável')
  await expect(painel).toContainText('mesmo com o ciclo favorável na API')
  const momento = painel.locator('.attention-moment').filter({ has: page.locator('summary .risk') }).first()
  if (!await momento.getAttribute('open').then(v => v !== null)) await momento.locator('summary').click()
  await expect(momento).toContainText('sensibilidade')
  await expect(momento).toContainText('O que conferir')
  await momento.getByRole('button', { name: 'Ver este momento' }).click()
  await expect(page.getByRole('slider')).toBeFocused()
  const agua = page.locator('.cena-card').filter({ hasText: 'Água para a cultura' })
  await expect(agua.locator('.wg-s')).toHaveText('Crítico')
  await expect(agua.locator('.wg-f')).toContainText('simulação local')
  await expect(page.locator('.attention-mark.current.risk')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('atencao-ciclo.png') })

  await page.getByRole('button', { name: /^Soja depois sorgo\./ }).click()
  await expect(painel.locator('.attention-name')).toHaveText('Soja → Sorgo')
  // Não mantém resultados da cultura anterior enquanto a nova corrida carrega.
  await expect(painel.locator('.attention-map')).toBeVisible({ timeout: 30000 })
  await expect(painel.locator('.attention-name')).not.toContainText('Milheto')
})

test('sem clima não exibe alertas de um talhão nem valor fixo de umidade', async ({ page }) => {
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ status: 500, json: {} }))
  await page.goto('/')
  const painel = page.getByRole('region', { name: 'Momentos de atenção da rotação' })
  await expect(painel).toContainText('Clima indisponível')
  await expect(painel.locator('.attention-map')).toHaveCount(0)
  const agua = page.locator('.cena-card').filter({ hasText: 'Água para a cultura' })
  await expect(agua.locator('.wg-v')).toHaveText('—')
  await expect(agua.locator('.wg-s')).toHaveText('Sem dado')
})
