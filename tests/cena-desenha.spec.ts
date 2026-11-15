import { test, expect } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { comClimaFixo } from './fixtures/clima'

// A cena do talhão precisa chegar a desenhar (um erro dentro do desenho deixaria a tela sem simulação).
test('a cena do talhão desenha, na safra e no pousio, sem erro na página', async ({ page }) => {
  test.setTimeout(120000)
  const erros: string[] = []
  page.on('pageerror', e => erros.push(e.message))
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
  await semRedeExterna(page); await comTalhaoSalvo(page); await comClimaFixo(page)
  await page.goto('/')
  const slider = page.getByRole('slider', { name: 'Arraste para simular um período' })
  for (const v of ['20', '33']) {
    await slider.fill(v)
    await expect(page.locator('.isow[data-simulacao="pronta"]')).toHaveCount(1, { timeout: 90000 })
    await page.waitForTimeout(1500)
  }
  await expect(page.locator('.iso-sim').first()).toBeVisible()
  expect(erros.filter(e => /is not a function|TypeError|ReferenceError/.test(e))).toEqual([])
})
