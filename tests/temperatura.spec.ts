import { test, expect, type Locator } from '@playwright/test'
import { comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07, comClimaFixo } from './fixtures/clima'

async function rotulosSemCorte(indicador: Locator) {
  const rotulos = indicador.locator('.wg-v')
  for (const rotulo of await rotulos.all()) {
    const semCorte = await rotulo.evaluate(el => {
      const r = el.getBoundingClientRect()
      for (let pai = el.parentElement; pai; pai = pai.parentElement) {
        const estilo = getComputedStyle(pai)
        const caixa = pai.getBoundingClientRect()
        if (['hidden', 'clip', 'auto', 'scroll'].includes(estilo.overflowY)
          && (r.top < caixa.top || r.bottom > caixa.bottom)) return false
        if (['hidden', 'clip', 'auto', 'scroll'].includes(estilo.overflowX)
          && (r.left < caixa.left || r.right > caixa.right)) return false
      }
      return true
    })
    expect(semCorte).toBe(true)
  }
}

test('temperaturas minima e maxima ficam visiveis ao mudar o periodo', async ({ page }) => {
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
  await page.goto('/')
  const indicador = page.locator('.pl').filter({ hasText: 'Temperatura' })
  // Widget da cena: mínima e máxima do decêndio em destaque ("21° a 29°").
  await expect(indicador.locator('.wg-v')).toHaveText('21° a 29°')
  await rotulosSemCorte(indicador)

  await page.getByRole('slider').focus()
  await page.keyboard.press('Home')
  await expect(indicador.locator('.wg-v')).toHaveText('19° a 35°')
  await rotulosSemCorte(indicador)
})

test('faixa estreita de temperatura cabe numa linha', async ({ page }, testInfo) => {
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({
    json: {
      ...CLIMA_T07,
      decendios: CLIMA_T07.decendios.map(d => ({ ...d, tmin_media: 27, tmax_media: 29 })),
    },
  }))
  await page.goto('/')
  const indicador = page.locator('.pl').filter({ hasText: 'Temperatura' })
  const rotulo = indicador.locator('.wg-v')
  await expect(rotulo).toHaveText('27° a 29°')
  await rotulosSemCorte(indicador)
  // Valor numa linha só, dentro do widget.
  expect((await rotulo.boundingBox())!.height).toBeLessThan(40)
  await indicador.screenshot({ path: testInfo.outputPath('temperatura-27-29.png') })
})
