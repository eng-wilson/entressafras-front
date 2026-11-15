import { test, expect, type Page } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { comClimaFixo } from './fixtures/clima'

const lateral = (page: Page) => page.getByRole('complementary', { name: 'Ajustes' })

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
  await page.goto('/')
})

test('trocar de talhão abre o mapa com a lista e volta ao escolher', async ({ page }) => {
  await lateral(page).getByRole('button', { name: 'Trocar de talhão ou adicionar um novo' }).click()
  const lista = page.getByRole('region', { name: 'Seus talhões' })
  await expect(lista).toBeVisible()
  await expect(lista.getByRole('button', { name: /T-07/ })).toHaveAttribute('aria-current', 'true')

  // Desenhar um novo e desistir volta para a lista, não para o primeiro acesso.
  await lista.getByRole('button', { name: 'Desenhar novo talhão' }).click()
  await expect(page.getByRole('toolbar', { name: 'Desenho do talhão' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lista).toBeVisible()

  await lista.getByRole('button', { name: /T-07/ }).click()
  await expect(lateral(page)).toContainText('T-07')
})

test('histórico abre em etapas e copia a safra seguinte', async ({ page }) => {
  await lateral(page).getByRole('button', { name: /^Histórico: Soja, milho/ }).click()
  const folha = page.getByRole('dialog', { name: /Histórico do T-07/ })
  await expect(folha).toBeVisible()
  await expect(folha.getByRole('button', { name: /Safra \d{4}\/\d{2}, completa/ })).toHaveAttribute('aria-pressed', 'true')

  // Registrar a safra anterior e repetir a cultura da seguinte.
  await folha.getByRole('button', { name: /^Registrar \d{4}\/\d{2}$/ }).click()
  await expect(folha.getByRole('button', { name: /Igual a / })).toBeVisible()
  await expect(folha.getByRole('button', { name: /Soja igual a / })).toBeVisible()
  await folha.getByRole('button', { name: /Igual a / }).click()
  await expect(folha.getByRole('button', { name: /, completa$/ })).toHaveCount(2)
  await folha.getByRole('button', { name: 'Salvar' }).click()
  await expect(folha).toBeHidden()

  await lateral(page).getByRole('button', { name: /^Histórico:/ }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /, completa$/ })).toHaveCount(2)
})

test('cancelar o histórico não muda nada', async ({ page }) => {
  await lateral(page).getByRole('button', { name: /^Histórico:/ }).click()
  const folha = page.getByRole('dialog')
  await folha.getByRole('button', { name: /^Registrar \d{4}\/\d{2}$/ }).click()
  await folha.getByRole('button', { name: /Igual a / }).click()
  await page.keyboard.press('Escape')
  await expect(folha).toBeHidden()
  await lateral(page).getByRole('button', { name: /^Histórico:/ }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /, completa$/ })).toHaveCount(1)
})

test('solo abre numa folha e o mapa só pelo botão de localização', async ({ page }) => {
  await lateral(page).getByRole('button', { name: /^Solo: Argiloso/ }).click()
  const folha = page.getByRole('dialog', { name: 'Solo do talhão' })
  await expect(folha.getByRole('radio', { name: /Médio/ })).toBeVisible()
  await folha.getByRole('button', { name: 'Mudar no mapa' }).click()
  await expect(page.getByRole('toolbar', { name: 'Desenho do talhão' })).toBeVisible()
})

test('chuva no ano no lugar da umidade', async ({ page }) => {
  await expect(lateral(page)).not.toContainText('Umidade hoje')
  await expect(lateral(page).getByText('Chuva no ano').locator('..')).toContainText(/\d mm/)
})
