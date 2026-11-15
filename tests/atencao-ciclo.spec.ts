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
  const direita = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  await expect(direita.getByRole('region', { name: 'Momentos de atenção da rotação' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Ajustes' }).locator('.attention-cycle')).toHaveCount(0)
  await expect(direita.locator('.insp-risk-chart, .insp-cycle-chart')).toHaveCount(0)
  await expect(painel.locator('.attention-map')).toBeVisible()
  await expect(direita.getByRole('heading', { name: 'Favorável no risco geral da API' })).toBeVisible()
  await expect(direita).toContainText('Provisório')
  await expect(painel).toContainText('mesmo com o ciclo favorável no risco geral')
  const momento = painel.locator('.attention-moment').filter({ has: page.locator('.ic.risk') }).first()
  await momento.click()
  await expect(direita.getByRole('heading', { name: 'Momento de atenção', exact: true })).toBeFocused()
  await expect(direita).toContainText('Crescimento vegetativo')
  await expect(direita).toContainText('40%')
  await expect(direita).toContainText('Média das safras históricas da API')
  await expect(direita).toContainText('O que conferir')
  await direita.getByRole('button', { name: 'Ver este momento' }).click()
  await expect(page.getByRole('slider', { name: 'Arraste para simular um período' })).toBeFocused()
  const agua = page.locator('.cena-card').filter({ hasText: 'Água para a cultura' })
  await expect(agua.locator('.wg-s')).toHaveText('Crítico')
  await expect(agua.locator('.wg-v')).toHaveText('0,40')
  await expect(agua.locator('.wg-f')).toContainText('média da API')
  await direita.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.locator('.attention-mark.current.risk')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('atencao-ciclo.png') })

  // Trocar de rotação troca o panorama junto (mesma resposta da API, outra rotação)
  await page.getByRole('button', { name: /^Soja depois sorgo\./ }).click()
  await expect(direita.getByRole('heading', { level: 2 })).toHaveText('Soja → sorgo')
  await expect(direita.getByRole('heading', { level: 2 })).not.toContainText('Milheto')
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
  await expect(painel.locator('.attention-moment').filter({ has: page.locator('.ic.risk') })).toHaveCount(1)
})
