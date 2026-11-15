import { test, expect, type Page } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { comClimaFixo } from './fixtures/clima'

// Palavras que só aparecem em português: se sobrar alguma na tela em inglês, faltou tradução.
const PORTUGUES = /\b(Rotações|Rotação|Safra|Calendário|Comparação|depois|Talhão|Solo|Histórico|Chuva|Temperatura|Colheita|Plantio|Sem dado|Favorável|Arriscado|Desfavorável|Resiliência|Produtividade|Saúde do solo|Economia de água|Atenção|Crítico|Momento|Período|Culturas|Safras|Posição|Recomendada|Escolher|Por safra|Água para a cultura|Pousio|Palhada)\b/

async function textoVisivel(page: Page) {
  return page.evaluate(() => document.body.innerText)
}

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
})

test('o seletor troca o app para inglês, sem sobrar texto em português, e a escolha fica salva', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Rotações' })).toBeVisible()
  await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click()

  await expect(page.getByRole('heading', { name: 'Rotations' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'How it works' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // Calendário: nenhuma palavra em português visível
  expect((await textoVisivel(page)).match(PORTUGUES)?.[0] ?? null).toBeNull()

  // Comparação também
  await page.getByRole('button', { name: 'Comparison' }).click()
  await expect(page.getByRole('heading', { name: 'Fit by priority' })).toBeVisible()
  expect((await textoVisivel(page)).match(PORTUGUES)?.[0] ?? null).toBeNull()

  // A escolha sobrevive a recarregar a página
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Rotations' })).toBeVisible()

  // E volta ao português
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Português' }).click()
  await expect(page.getByRole('heading', { name: 'Rotações' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test.describe('navegador em inglês', () => {
  test.use({ locale: 'en-US' })
  test('sem escolha salva, abre no idioma do navegador', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Rotations' })).toBeVisible()
  })
})
