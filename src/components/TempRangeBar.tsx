import type { TempResult } from '../types'

// Widget de temperatura (padrão dos widgets da cena): mínima e máxima do decêndio em destaque e a faixa
// entre elas como uma cápsula sobre a escala de 0 a 45 °C, com os limites da cultura marcados.
// As posições vêm de tempGauge.ts em unidades da trilha antiga (0–TRILHA).
const TRILHA = 268
const pct = (x: number) => `${Math.max(0, Math.min(TRILHA, x)) / TRILHA * 100}%`
const parada = (z: string) => `${parseFloat(z) * 100}%`

export function TempRangeBar({ temp, carregando = false, carregandoReferencia = false }: { temp: TempResult; carregando?: boolean; carregandoReferencia?: boolean }) {
  const grad = `linear-gradient(90deg, ${[
    [temp.c0, temp.z0], [temp.c1, temp.z1], [temp.c2, temp.z2], [temp.c3, temp.z3], [temp.c4, temp.z4],
    [temp.c5, temp.z5], [temp.c6, temp.z6], [temp.c7, temp.z7], [temp.c8, temp.z8],
  ].map(([c, z]) => `${c} ${parada(z)}`).join(', ')})`
  // A cápsula mostra o trecho do degradê que ela cobre: o fundo tem a largura da trilha inteira.
  const largura = Math.max(temp.rw, 1)
  const capsula = {
    left: pct(temp.rx), width: pct(largura), backgroundImage: grad,
    backgroundSize: `${TRILHA / largura * 100}% 100%`,
    backgroundPosition: `${TRILHA - largura > 0 ? temp.rx / (TRILHA - largura) * 100 : 0}% 0`,
  }
  const limites = [{ x: temp.x1, forte: false }, { x: temp.x2, forte: false }, { x: temp.x3, forte: true }, { x: temp.x4, forte: true }]
    .filter(l => l.x >= 0)

  return (
    <div className="pl wg" aria-label={carregando ? 'Temperatura: carregando' : temp.aria}>
      <span className="wg-h">
        <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-temp" /></svg>
        Temperatura
      </span>
      <span className="wg-v">
        {carregando ? <span className="sk sk-num" /> : temp.semDado ? '–' : (
          <><span className="wg-min">{temp.loLabel}</span><small> a </small><span className="wg-max">{temp.hiLabel}</span></>
        )}
      </span>
      {carregando || carregandoReferencia ? <span className="sk sk-chip" /> : (
        <span className={`pl-s wg-s ${temp.semDado || temp.label === 'Sem referência' ? 'neu' : temp.cls}`}>
          <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${temp.icon.replace('#', '')}`} /></svg>
          {temp.label}
        </span>
      )}
      <div className="wg-g" aria-hidden="true">
        <div className="wg-tr" style={{ backgroundImage: grad }}>
          <i className="wg-apagado" />
          {limites.map((l, i) => <b key={i} className={l.forte ? 'forte' : ''} style={{ left: pct(l.x) }} />)}
          {!temp.semDado && !carregando && <span className="wg-cap" style={capsula} />}
        </div>
      </div>
      <span className="wg-f">mínima e máxima do decêndio</span>
    </div>
  )
}
