// Símbolo da marca: a safra atual (folha da esquerda), a recomendada (folha da direita), o vão da entressafra
// entre elas e o satélite que aponta a antena para a folha nova. Abaixo de 24 px o satélite vira ruído:
// use `semSatelite` (é o desenho do favicon).
type Props = { semSatelite?: boolean }

export function SimboloMarca({ semSatelite = false }: Props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M28.6 59C30.8 42 26.6 25.5 15.8 14.6C8.4 28.8 8.6 48.4 28.6 59Z"
        fill="#F3EEDC" stroke="#F3EEDC" strokeWidth="2.2" strokeLinejoin="round"
      />
      <path
        d="M33.6 59C33 43 39 30.4 50.4 21.4C53.8 38 48.6 52.4 33.6 59Z"
        fill="#A6CE39" stroke="#A6CE39" strokeWidth="2.2" strokeLinejoin="round"
      />
      {!semSatelite && (
        <g transform="translate(35.4 13.4) rotate(-45) scale(.7)">
          <rect fill="#F3EEDC" x="-12.4" y="-.75" width="24.8" height="1.5" rx=".75" />
          <g fill="#E5A823">
            <rect x="-14" y="-4.4" width="4.6" height="8.8" rx=".8" />
            <rect x="-8.9" y="-4.4" width="4.6" height="8.8" rx=".8" />
            <rect x="4.3" y="-4.4" width="4.6" height="8.8" rx=".8" />
            <rect x="9.4" y="-4.4" width="4.6" height="8.8" rx=".8" />
          </g>
          <rect fill="#F3EEDC" x="-3.5" y="-3.5" width="7" height="7" rx="1.6" />
          <path fill="#F3EEDC" d="M-3.6 4.6Q0 10.2 3.6 4.6Z" />
        </g>
      )}
    </svg>
  )
}
