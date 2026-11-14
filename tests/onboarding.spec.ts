import { test, expect, type Page } from '@playwright/test';
import { comTalhaoSalvo, semRedeExterna } from './fixtures/talhao';

// Sem permissão de localização: o mapa cai em Rio Verde, GO.
test.use({ permissions: [] });

test.beforeEach(({ page }) => semRedeExterna(page));

const talhao = (page: Page) => page.getByRole('complementary', { name: 'Ajustes' });

async function marcarCantos(page: Page) {
  const mapa = page.locator('.ob-mapa');
  const box = (await mapa.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  for (const [dx, dy] of [[-120, -90], [120, -90], [120, 90], [-120, 90]]) {
    await page.mouse.click(cx + dx, cy + dy);
  }
}

test('primeiro acesso: desenha, informa solo e safra, e vê a Sidebar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Marque seu primeiro talhão' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Rio Verde, GO');

  await page.getByRole('button', { name: 'Desenhar no mapa' }).click();
  const concluir = page.getByRole('toolbar', { name: 'Desenho do talhão' }).getByRole('button', { name: 'Concluir' });
  await expect(concluir).toBeDisabled();
  await marcarCantos(page);
  await expect(page.getByText(/4 cantos · ≈ \d/)).toBeVisible();
  await concluir.click();

  const janela = page.getByRole('dialog');
  await janela.getByLabel('Nome').fill('Talhão da Sede');
  await janela.getByRole('button', { name: 'Continuar' }).click();
  await janela.getByRole('radio', { name: /Médio/ }).click();
  await janela.getByRole('button', { name: 'Continuar' }).click();
  await janela.getByRole('button', { name: 'Soja' }).click();
  await janela.getByRole('option', { name: /Milho/ }).first().click();
  await janela.getByRole('button', { name: 'Concluir e ver sugestões' }).click();

  const side = talhao(page);
  await expect(side).toContainText('Talhão da Sede');
  await expect(side).toContainText('Médio');
  await expect(side).toContainText('Soja, milho');
  await expect(side).toContainText('Rio Verde, GO');

  // Recarregar mantém o talhão.
  await page.reload();
  await expect(talhao(page)).toContainText('Talhão da Sede');
});

test('talhão de exemplo vai direto para a tela principal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Usar um talhão de exemplo/ }).click();
  const side = talhao(page);
  await expect(side).toContainText('Talhão exemplo');
  await expect(side).toContainText('43 ha');
  await expect(side).toContainText('Argiloso');
});

test('editar o solo pela Sidebar', async ({ page }) => {
  await comTalhaoSalvo(page);
  await page.goto('/');
  await talhao(page).getByRole('button', { name: /^Solo: Argiloso/ }).click();

  const janela = page.getByRole('dialog');
  await expect(janela.getByRole('heading', { name: 'Solo do talhão' })).toBeVisible();
  await janela.getByRole('radio', { name: /Não sei/ }).click();
  await janela.getByRole('button', { name: 'Salvar' }).click();

  await expect(talhao(page)).toContainText('Padrão da região');
  await expect(talhao(page)).toContainText('Soja, milho');
});

test('cancelar a edição volta sem mudar nada', async ({ page }) => {
  await comTalhaoSalvo(page);
  await page.goto('/');
  await talhao(page).getByRole('button', { name: /^T-07: 42 ha/ }).click();
  await expect(page.getByRole('toolbar', { name: 'Desenho do talhão' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(talhao(page)).toContainText('42 ha');
});
