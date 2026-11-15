import { test, expect } from '@playwright/test'
import { comTalhaoSalvo } from './fixtures/talhao'
import { comClimaFixo, CLIMA_T07 } from './fixtures/clima'
import { comCulturasFixas } from './fixtures/culturas'

test('catálogo mostra requisitos, cultivares gerais e ausência de referência sem consultar diário', async ({ page }, testInfo) => {
  const diarios: string[] = []
  page.on('request', r => { if (r.url().includes('/api/clima/diario')) diarios.push(r.url()) })
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
  await page.goto('/')
  await expect(page.locator('.pl').filter({ hasText: 'Temperatura' }).locator('.pl-s')).toHaveText('Bom')
  await page.locator('.insp summary').filter({ hasText: 'Datas e requisitos' }).click()
  const abrir = page.getByRole('button', { name: 'Consultar requisitos de Soja', exact: true })
  await abrir.click()
  const janela = page.getByRole('dialog', { name: 'Dados das culturas' })
  await expect(janela).toContainText('Glycine max')
  await expect(janela).toContainText('600 a 1.500 mm/ano')
  await expect(janela).toContainText('75 a 180 dias')
  await janela.screenshot({ path: testInfo.outputPath('catalogo-culturas.png') })
  await janela.getByRole('combobox').selectOption('brizantha_marandu')
  await expect(janela).toContainText('O catálogo não diferencia esta cultivar')
  await janela.getByRole('combobox').selectOption('crotalaria_ochroleuca')
  await expect(janela).toContainText('Sem referência para esta cultura')
  await page.keyboard.press('Escape')
  await expect(janela).toHaveCount(0)
  await expect(abrir).toBeFocused()
  expect(diarios).toEqual([])
})

test('milho usa limite térmico do catálogo em vez de ficar sempre Bom', async ({ page }) => {
  await comTalhaoSalvo(page)
  await page.route(/\/api\/clima\/decendios/, r => r.fulfill({ json: {
    ...CLIMA_T07, decendios: CLIMA_T07.decendios.map(d => ({ ...d, tmin_media: 22, tmax_media: 35 })),
  } }))
  await page.goto('/')
  const slider = page.getByRole('slider')
  await slider.fill('18')
  await expect(page.locator('.pl').filter({ hasText: 'Temperatura' }).locator('.pl-s')).toHaveText('Calor · Atenção')
})

test('falha no catálogo preserva temperaturas e permite tentar novamente', async ({ page }) => {
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
  await page.route(/\/api\/crops/, r => r.fulfill({ status: 500, json: {} }))
  await page.goto('/')
  const temp = page.locator('.pl').filter({ hasText: 'Temperatura' })
  await expect(temp).toContainText('Sem referência')
  await expect(temp.locator('.wg-v')).toHaveText('21° a 29°')
  await expect(page.getByRole('alert')).toContainText('requisitos da cultura')
  await comCulturasFixas(page)
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(temp.locator('.pl-s')).toHaveText('Bom')
})
