// Aviso discreto no topo do main quando o clima não carregou (HANDOFF-SPEC §6). A tela nunca some.
export function AvisoClima({ onRecarregar }: { onRecarregar: () => void }) {
  return (
    <div className="aviso" role="alert">
      <svg className="ic" aria-hidden="true">
        <use href="/canvas-icons.svg#i-alert" />
      </svg>
      <span>Alguns dados não carregaram.</span>
      <button type="button" className="link" onClick={onRecarregar}>Tentar de novo</button>
    </div>
  )
}
