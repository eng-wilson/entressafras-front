import { test, expect } from '@playwright/test'
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao'
import { comClimaFixo } from './fixtures/clima'
import { comRotacoesFixas } from './fixtures/rotacoes'
import { ROTACOES_FIXTURE } from '../src/data/rotacoesFixture'

test.beforeEach(async ({ page }) => {
  await semRedeExterna(page)
  await comTalhaoSalvo(page)
  await comClimaFixo(page)
  // Momentos de atenção vêm do atendimento por fase da API: a rotação aberta (soja → milho safrinha) recebe
  // duas fases com ISNA baixo (soja no desenvolvimento, milho no meio do ciclo) para haver momentos a navegar.
  const r = structuredClone(ROTACOES_FIXTURE)
  r.rotations[2].crops[0].crop.risk.mean_isna.development = 0.5
  r.rotations[2].crops[1].crop.risk.mean_isna.mid_season = 0.4
  await comRotacoesFixas(page, r)
  await page.goto('/')
})

test('faixa navega por teclado, clique e arraste mantendo foco e calendário sincronizados', async ({ page }, testInfo) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const faixa = insp.getByRole('slider', { name: 'Navegar períodos de atenção' })
  const calendario = page.getByRole('slider', { name: 'Arraste para simular um período' })
  await expect(faixa).toBeVisible({ timeout: 30000 })
  await faixa.focus()
  await page.keyboard.press('Home')
  await expect(faixa).toHaveValue('0')
  await expect(calendario).toHaveValue('0')
  await expect(faixa).toBeFocused()
  await expect(insp.getByRole('button', { name: 'Momento anterior', exact: true })).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(faixa).toHaveValue('1')
  await expect(calendario).toHaveValue('1')
  await page.keyboard.press('End')
  await expect(calendario).toHaveValue('35')
  await expect(insp.getByRole('button', { name: 'Próximo momento', exact: true })).toBeDisabled()
  await expect(faixa).toBeFocused()

  const box = (await faixa.boundingBox())!
  await faixa.click({ position: { x: box.width * .4, y: box.height / 2 } })
  const clicado = Number(await faixa.inputValue())
  expect(clicado).toBeGreaterThan(10)
  expect(clicado).toBeLessThan(17)
  await expect(calendario).toHaveValue(String(clicado))
  await expect(faixa).toBeFocused()

  await faixa.press('Home')
  const area = (await faixa.boundingBox())!
  await page.mouse.move(area.x + 7, area.y + area.height / 2)
  await page.mouse.down()
  await page.mouse.move(area.x + area.width - 8, area.y + area.height / 2, { steps: 10 })
  await page.mouse.up()
  expect(Number(await faixa.inputValue())).toBeGreaterThan(30)
  await expect(calendario).toHaveValue(await faixa.inputValue())

  await faixa.press('End')
  const anterior = insp.getByRole('button', { name: 'Momento anterior', exact: true })
  await expect(anterior).toBeEnabled()
  await anterior.click()
  expect(Number(await faixa.inputValue())).toBeLessThan(35)
  await expect(calendario).toHaveValue(await faixa.inputValue())
  await expect(anterior).toBeFocused()
  await insp.screenshot({ path: testInfo.outputPath('inspector-navigation.png') })
})

test('linhas abrem detalhes com voltar, Escape e restauração do foco', async ({ page }) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const solo = insp.getByRole('button', { name: 'Saúde do solo' })
  await solo.click()
  await expect(insp.getByRole('heading', { name: 'Saúde do solo', exact: true })).toBeFocused()
  await expect(insp).toContainText('O que avaliar')
  await page.keyboard.press('Escape')
  await expect(solo).toBeFocused()
  await expect(insp.getByRole('heading', { level: 2 })).toHaveText('Soja → milho safrinha')

  const metodo = insp.getByRole('button', { name: 'Como ler estes momentos' })
  await expect(metodo).toBeVisible({ timeout: 30000 })
  await metodo.click()
  await expect(insp.getByRole('heading', { name: 'Como ler estes momentos', exact: true })).toBeFocused()
  await expect(insp).toContainText('Não é previsão')
  await insp.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(metodo).toBeFocused()
})

test('bloco de culturas seleciona o calendário e mostra apenas a posição recebida', async ({ page }) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const calendario = page.getByRole('slider', { name: 'Arraste para simular um período' })
  await expect(insp.locator('.insp-rank strong')).toHaveText('3ª de 4')
  const soja = insp.getByRole('button', { name: /^Ver Soja no calendário\./ })
  const milho = insp.getByRole('button', { name: /^Ver Milho safrinha no calendário\./ })
  await expect(soja).toHaveAttribute('aria-pressed', 'true')
  await milho.click()
  await expect(milho).toHaveAttribute('aria-pressed', 'true')
  await expect(calendario).toHaveValue('13')
  await expect(page.locator('.fpill')).toContainText('Milho')
  await calendario.fill('5')
  await expect(soja).toHaveAttribute('aria-pressed', 'true')
  await expect(milho).toHaveAttribute('aria-pressed', 'false')
})

test.describe('toque', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test('toque na faixa seleciona o período na tela compacta', async ({ page }, testInfo) => {
    await page.getByRole('link', { name: 'Entender esta rotação e os próximos passos' }).click()
    const faixa = page.getByRole('slider', { name: 'Navegar períodos de atenção' })
    await expect(faixa).toBeVisible({ timeout: 30000 })
    await faixa.scrollIntoViewIfNeeded()
    const area = (await faixa.boundingBox())!
    await faixa.tap({ position: { x: area.width * .75, y: area.height / 2 } })
    expect(Number(await faixa.inputValue())).toBeGreaterThan(20)
    await expect(page.getByRole('slider', { name: 'Arraste para simular um período' })).toHaveValue(await faixa.inputValue())
    await page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' }).screenshot({ path: testInfo.outputPath('inspector-touch.png') })
  })
})
