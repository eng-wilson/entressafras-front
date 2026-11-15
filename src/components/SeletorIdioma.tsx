// Seletor de idioma no cabeçalho (PT | EN), no padrão de controle segmentado do iOS.
import { idioma, t, type Idioma } from '../i18n'

const OPCOES: { id: Idioma; rotulo: string; nome: string }[] = [
  { id: 'pt', rotulo: 'PT', nome: 'Português' },
  { id: 'en', rotulo: 'EN', nome: 'English' },
]

export function SeletorIdioma({ onTrocar }: { onTrocar: (i: Idioma) => void }) {
  const atual = idioma()
  return (
    <div className="idioma" role="group" aria-label={t('Idioma')}>
      {OPCOES.map(o => (
        <button key={o.id} type="button" className={atual === o.id ? 'on' : undefined} aria-pressed={atual === o.id}
          lang={o.id === 'en' ? 'en' : 'pt-BR'} aria-label={o.nome} onClick={() => atual !== o.id && onTrocar(o.id)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
