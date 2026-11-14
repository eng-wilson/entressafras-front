import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Estado de cada cenário de teste
// ---------------------------------------------------------------------------

interface TestState {
  id: string;
  setup: (page: Page) => Promise<void>;
}

async function waitReady(page: Page) {
  await page.waitForLoadState('networkidle');
  // Aguarda animações iniciais e renderização do JS da referência
  await page.waitForTimeout(300);
}

const STATES: TestState[] = [
  {
    id: 'initial',
    setup: waitReady,
  },
  {
    id: 'compare-mode',
    setup: async (page) => {
      await waitReady(page);
      await page.getByRole('button', { name: 'Comparação' }).click();
      await page.waitForTimeout(100);
    },
  },
  {
    id: 'slider-start',
    setup: async (page) => {
      await waitReady(page);
      await page.locator('input[type="range"]').focus();
      await page.keyboard.press('Home');
      await page.waitForTimeout(100);
    },
  },
  {
    id: 'slider-end',
    setup: async (page) => {
      await waitReady(page);
      await page.locator('input[type="range"]').focus();
      await page.keyboard.press('End');
      await page.waitForTimeout(100);
    },
  },
  {
    id: 'all-switches-on',
    setup: async (page) => {
      await waitReady(page);
      const switches = page.getByRole('switch');
      const count = await switches.count();
      for (let i = 0; i < count; i++) {
        const sw = switches.nth(i);
        if ((await sw.getAttribute('aria-checked')) === 'false') {
          await sw.click();
        }
      }
      await page.waitForTimeout(100);
    },
  },
];

// ---------------------------------------------------------------------------
// Fase 1 — Gera goldens a partir da referência
// Execute com: pnpm exec playwright test --update-snapshots -g "ref:"
// ---------------------------------------------------------------------------

test.describe('ref: gera goldens da referência', () => {
  for (const state of STATES) {
    test(`ref: ${state.id}`, async ({ page }) => {
      await page.goto('/reference/ClimaMes2.dc.html');
      await state.setup(page);
      await expect(page).toHaveScreenshot(`ref-${state.id}.png`);
    });
  }
});

// ---------------------------------------------------------------------------
// Fase 2 — Compara o app React contra os goldens da referência
// Execute com: pnpm exec playwright test -g "app:"
// ---------------------------------------------------------------------------

test.describe('app: paridade com referência', () => {
  for (const state of STATES) {
    test(`app: ${state.id}`, async ({ page }) => {
      await page.goto('/');
      await state.setup(page);
      // Usa o mesmo nome de snapshot gerado pelo teste "ref:" correspondente
      await expect(page).toHaveScreenshot(`ref-${state.id}.png`);
    });
  }
});
