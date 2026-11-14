import { test, expect, type Locator } from '@playwright/test'
import { comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07, comClimaFixo } from './fixtures/clima'

async function rotulosSemCorte(indicador: Locator) {
  const rotulos = indicador.locator('.vtag')
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
  await expect(indicador.locator('.vtag')).toHaveText('mín 21° máx 29°')
  await rotulosSemCorte(indicador)

  await page.getByRole('slider').focus()
  await page.keyboard.press('Home')
  await expect(indicador.locator('.vtag')).toHaveText(['mín 19°', 'máx 35°'])
  await rotulosSemCorte(indicador)
})

test('faixa estreita de temperatura tem rotulo compacto', async ({ page }, testInfo) => {
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({
    json: {
      ...CLIMA_T07,
      decendios: CLIMA_T07.decendios.map(d => ({ ...d, tmin_media: 27, tmax_media: 29 })),
    },
  }))
  await page.goto('/')
  const indicador = page.locator('.pl').filter({ hasText: 'Temperatura' })
  const rotulo = indicador.locator('.vtag')
  await expect(rotulo).toHaveText('mín 27° máx 29°')
  await rotulosSemCorte(indicador)
  expect((await rotulo.boundingBox())!.height).toBeLessThan(26)
  await indicador.screenshot({ path: testInfo.outputPath('temperatura-27-29.png') })
})
