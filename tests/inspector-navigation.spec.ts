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

test('prioridades na região: 4 linhas visuais; tocar numa abre a explicação e voltar devolve o foco', async ({ page }) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const params = insp.getByRole('region', { name: 'Prioridades na sua região' }).getByRole('button')
  await expect(params).toHaveCount(4, { timeout: 30000 })
  await expect(params.nth(0)).toHaveAccessibleName(/^Resiliência climática: \d+ de 100, (ótima|média|fraca)\. Ver o que significa$/)
  await expect(params.nth(1)).toHaveAccessibleName(/^Economia de água: .* · ilustrativo\. Ver o que significa$/)
  // Prioridades ligadas na API ficam destacadas (na fixture: resiliência, solo e produtividade; água não é da API)
  await expect(insp.locator('.insp-param.on')).toHaveCount(3)

  await params.nth(2).click()
  await expect(insp.getByRole('heading', { name: 'Saúde do solo', exact: true, level: 2 })).toBeFocused()
  await expect(insp).toContainText('cobertura viva e troca de família botânica')
  await expect(insp).toContainText('Entra na ordem das rotações')
  await page.keyboard.press('Escape')
  await expect(params.nth(2)).toBeFocused()

  await params.nth(1).click()
  await expect(insp).toContainText('Ainda não entra na ordem das rotações.')
  await insp.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(params.nth(1)).toBeFocused()
})

test('cards da comparação usam a mesma linha de prioridade, na escala do card', async ({ page }) => {
  await page.getByRole('button', { name: 'Comparação' }).click()
  const card = page.locator('.qm-card').first()
  await expect(card.locator('.bp-linha.bp-compacto')).toHaveCount(4)
  await expect(card.getByRole('meter').first()).toHaveAccessibleName(/^Resiliência climática: \d+ de 100/)
})

test('momentos de atenção: só a lista; cada momento leva o calendário ao período e abre o detalhe', async ({ page }, testInfo) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const lista = insp.getByRole('region', { name: 'Momentos de atenção da rotação' })
  const calendario = page.getByRole('slider', { name: 'Arraste para simular um período' })
  await expect(lista.locator('.attention-moment').first()).toBeVisible({ timeout: 30000 })
  await expect(insp.getByRole('slider', { name: 'Navegar períodos de atenção' })).toHaveCount(0)
  await calendario.fill('0')
  await lista.locator('.attention-moment').first().click()
  await expect(insp.getByRole('heading', { name: 'Momento de atenção', exact: true })).toBeFocused()
  expect(Number(await calendario.inputValue())).toBeGreaterThan(0)
  await insp.screenshot({ path: testInfo.outputPath('inspector-navigation.png') })
})

test('linhas abrem detalhes com voltar, Escape e restauração do foco', async ({ page }) => {
  const insp = page.getByRole('complementary', { name: 'Detalhe da rotação selecionada' })
  const solo = insp.locator('[data-inspector-open="soil"]')
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
  const soja = insp.getByRole('button', { name: /^Ver a 1ª safra \(Soja\) no calendário\./ })
  const milho = insp.getByRole('button', { name: /^Ver a 2ª safra \(Milho safrinha\) no calendário\./ })
  await expect(soja).toHaveAttribute('aria-pressed', 'true')
  await milho.click()
  await expect(milho).toHaveAttribute('aria-pressed', 'true')
  await expect(calendario).toHaveValue('13')
  await expect(page.locator('.fpill')).toContainText('Milho')
  await calendario.fill('5')
  await expect(soja).toHaveAttribute('aria-pressed', 'true')
  await expect(milho).toHaveAttribute('aria-pressed', 'false')
})
