/** Ícone do sprite /canvas-icons.svg. */
export function Icone({ id, className = 'ic' }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`/canvas-icons.svg#${id}`} />
    </svg>
  )
}
