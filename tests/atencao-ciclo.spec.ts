import { test, expect, type Page } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'
import { ROTACOES_FIXTURE } from '../src/data/rotacoesFixture'
import type { RotationRecommendations } from '../src/types'

/** Rotações da API com um ajuste no ISNA por fase (o resto igual à fixture). */
async function comRotacoes(page: Page, ajustar: (r: RotationRecommendations) => void) {
  const r = structuredClone(ROTACOES_FIXTURE)
  ajustar(r)
  await page.route(/\/api\/rotations\/recommendations/, rota => rota.fulfill({ json: r }))
}

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: CLIMA_T07 }))
})

test('rotação favorável na API com uma fase de atendimento baixo: momento, ação e o mesmo estado no widget', async ({ page }, testInfo) => {
  // Milheto: risco 20% (favorável), mas a API informa ISNA 0,40 no desenvolvimento (fase II).
  await comRotacoes(page, r => { r.rotations[0].crops[1].crop.risk.mean_isna.development = 0.4 })
  await page.goto('/')
  await page.getByRole('button', { name: /^Soja depois milheto\./ }).click()
  const painel = page.getByRole('region', { name: 'Momentos de atenção da rotação' })
  await expect(painel.locator('.attention-map')).toBeVisible()
  await expect(painel.locator('.attention-overall')).toContainText('API: favorável')
  await expect(painel.locator('.attention-overall')).toContainText('provisório')
  await expect(painel).toContainText('mesmo com o ciclo favorável no risco geral')
  const momento = painel.locator('.attention-moment').filter({ has: page.locator('summary .risk') }).first()
  if (!await momento.getAttribute('open').then(v => v !== null)) await momento.locator('summary').click()
  await expect(momento).toContainText('Crescimento vegetativo')
  await expect(momento).toContainText('40%')
  await expect(momento).toContainText('média das safras históricas da API')
  await expect(momento).toContainText('O que conferir')
  await momento.getByRole('button', { name: 'Ver este momento' }).click()
  await expect(page.getByRole('slider')).toBeFocused()
  const agua = page.locator('.cena-card').filter({ hasText: 'Água para a cultura' })
  await expect(agua.locator('.wg-s')).toHaveText('Crítico')
  await expect(agua.locator('.wg-v')).toHaveText('0,40')
  await expect(agua.locator('.wg-f')).toContainText('média da API')
  await expect(page.locator('.attention-mark.current.risk')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('atencao-ciclo.png') })

  // Trocar de rotação troca o panorama junto (mesma resposta da API, outra rotação)
  await page.getByRole('button', { name: /^Soja depois sorgo\./ }).click()
  await expect(painel.locator('.attention-name')).toHaveText('Soja → Sorgo')
  await expect(painel.locator('.attention-moment')).toHaveCount(0)
})

test('sem o atendimento por fase na resposta, nada é estimado: sem momentos e widget sem dado', async ({ page }) => {
  await comRotacoes(page, r => {
    for (const rot of r.rotations) for (const c of rot.crops) c.crop.risk.risk_percentage = null
  })
  await page.goto('/')
  const painel = page.getByRole('region', { name: 'Momentos de atenção da rotação' })
  await expect(painel).toContainText('A API não trouxe o atendimento por fase')
  await expect(painel.locator('.attention-moment')).toHaveCount(0)
  const agua = page.locator('.cena-card').filter({ hasText: 'Água para a cultura' })
  await expect(agua.locator('.wg-v')).toHaveText('—')
  await expect(agua.locator('.wg-s')).toHaveText('Sem dado')
})

test('falha do clima não apaga nem substitui o que veio da API de rotações', async ({ page }) => {
  await comRotacoes(page, r => { r.rotations[0].crops[1].crop.risk.mean_isna.development = 0.4 })
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ status: 500, json: {} }))
  await page.goto('/')
  await page.getByRole('button', { name: /^Soja depois milheto\./ }).click()
  const painel = page.getByRole('region', { name: 'Momentos de atenção da rotação' })
  await expect(painel.locator('.attention-moment').filter({ has: page.locator('summary .risk') })).toHaveCount(1)
})
