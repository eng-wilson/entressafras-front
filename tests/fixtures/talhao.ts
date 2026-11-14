import type { Page } from '@playwright/test';
import { comCulturasFixas } from './culturas';

/** Mesma chave de src/services/storage.ts. */
export const CHAVE = 'entressafras.talhoes.v1';

/** Talhão igual ao que a tela principal mostrava fixo (T-07, 42 ha, Argiloso, Soja e milho, Sorriso, MT). */
export const TALHAO_T07 = {
  id: 't-07',
  nome: 'T-07',
  contorno: [[-12.54, -55.72], [-12.54, -55.714], [-12.5457, -55.714], [-12.5457, -55.72]],
  areaHa: 42,
  centro: { lat: -12.54285, lon: -55.717 },
  local: 'Sorriso, MT',
  textura: 'argiloso',
  texturaInformada: true,
  texturaPeloLaudo: false,
  analise: null,
  classe: 'latossolo_vermelho',
  historico: { '2025/26': { c1: 'soja', c2: 'milho' } },
};

/** Grava o talhão antes de a página carregar, para o app abrir direto na tela principal. */
export async function comTalhaoSalvo(page: Page, talhao: object = TALHAO_T07) {
  await comCulturasFixas(page);
  await page.addInitScript(([chave, valor]) => {
    window.localStorage.setItem(chave, valor);
  }, [CHAVE, JSON.stringify({ talhoes: [talhao], ativo: (talhao as { id: string }).id })] as const);
}

/** Evita rede externa nos testes: tiles viram vazios e o Nominatim responde fixo. */
export async function semRedeExterna(page: Page, cidade = { city: 'Rio Verde', state: 'Goiás', 'ISO3166-2-lvl4': 'BR-GO' }) {
  await comCulturasFixas(page);
  await page.route(/tile\.openstreetmap\.org|arcgisonline\.com/, r => r.fulfill({ status: 204, body: '' }));
  await page.route(/nominatim\.openstreetmap\.org\/reverse/, r => r.fulfill({ json: { address: cidade } }));
  await page.route(/nominatim\.openstreetmap\.org\/search/, r => r.fulfill({ json: [{ lat: '-12.54', lon: '-55.72' }] }));
}
