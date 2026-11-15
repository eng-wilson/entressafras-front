import { test, expect } from '@playwright/test'
import { comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'

test('chuva acompanha cada decêndio do mesmo mês e preserva dado ausente', async ({ page }) => {
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({
    json: {
      ...CLIMA_T07,
      decendios: CLIMA_T07.decendios.map(d => ({
        ...d, chuva_media: d.idx === 9 ? 15 : d.idx === 10 ? 60 : d.idx === 11 ? null : d.chuva_media,
      })),
    },
  }))
  await page.goto('/')
  const indicador = page.locator('.vg')
  const slider = page.getByRole('slider', { name: 'Arraste para simular um período' })
  await expect(indicador).toHaveAttribute('aria-label', 'Chuva do decêndio: 60 milímetros, Chuva boa')
  await expect(slider).toHaveAttribute('aria-valuetext', /60 milímetros no decêndio/)
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(indicador).toHaveAttribute('aria-label', 'Chuva do decêndio: 15 milímetros, Seco')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(indicador).toHaveAttribute('aria-label', 'Chuva do decêndio: sem dado')
  await expect(indicador).toContainText('Sem dado')
})
