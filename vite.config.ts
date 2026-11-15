/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * Sprites da simulação portátil (/simulacao). O carregador (render/sprites/manifest.js) acha a pasta por
 * `new URL('../../../assets/sprites/', import.meta.url)`, que o Vite estraga: no dev ele tira a barra final
 * (o pedido vira `.../spritessoja/manifest.json` e cai no index.html), no build não resolve a pasta.
 * O plugin troca essa URL por uma fixa: no dev, a pasta original servida da raiz; no build, `<base>simulacao/sprites/`,
 * para onde vai só o que os manifestos usam.
 */
function spritesDaSimulacao(): Plugin {
  const pasta = fileURLToPath(new URL('./simulacao/assets/sprites/', import.meta.url))
  const ORIGINAL = "new URL('../../../assets/sprites/', import.meta.url).href"
  let destino = '/simulacao/assets/sprites/'
  return {
    name: 'sprites-da-simulacao',
    // Antes do plugin de assets do Vite, que reescreve new URL(..., import.meta.url).
    enforce: 'pre',
    configResolved(c) {
      destino = c.base + (c.command === 'build' ? 'simulacao/sprites/' : 'simulacao/assets/sprites/')
    },
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/simulacao/src/render/sprites/manifest.js')) return
      // Falha alto se a simulação mudar o carregador: sem isso a arte sumiria em silêncio no build.
      if (!code.includes(ORIGINAL)) throw new Error('sprites-da-simulacao: carregador de sprites mudou em manifest.js')
      return { code: code.replace(ORIGINAL, JSON.stringify(destino)), map: null }
    },
    generateBundle() {
      for (const cultura of readdirSync(pasta)) {
        const man = join(pasta, cultura, 'manifest.json')
        if (!existsSync(man)) continue
        const { sprites = {} } = JSON.parse(readFileSync(man, 'utf8')) as { sprites?: Record<string, { cor?: string; dados?: string }> }
        const arquivos = new Set(['manifest.json'])
        for (const s of Object.values(sprites)) for (const f of [s.cor, s.dados]) if (f) arquivos.add(f)
        for (const f of arquivos) {
          this.emitFile({ type: 'asset', fileName: `simulacao/sprites/${cultura}/${f}`, source: readFileSync(join(pasta, cultura, f)) })
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spritesDaSimulacao()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
