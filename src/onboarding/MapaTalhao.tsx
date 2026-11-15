import 'leaflet/dist/leaflet.css'
import type { Map as LMap } from 'leaflet'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { Contorno } from '../types'
import { VISTA_INICIAL } from './exemplo'

export type Camada = 'mapa' | 'sat'
const VERDE = '#1E7A3C'

const CAMADAS: Record<Camada, { url: string; attribution: string }> = {
  mapa: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagem © Esri' },
}

type Props = {
  camada: Camada
  /** Cantos marcados (desenho) ou o contorno pronto (janela aberta). */
  pontos: Contorno
  fechado: boolean
  desenhando: boolean
  /** Contorno atual do talhão em edição, mostrado esmaecido atrás do novo desenho. */
  fundo?: Contorno | null
  /** Talhões salvos (modo de escolha): contornos clicáveis, o ativo em destaque. */
  talhoes?: { id: string; nome: string; contorno: Contorno; ativo: boolean }[]
  onEscolher?: (id: string) => void
  onPonto: (p: [number, number]) => void
  onMapa: (m: LMap | null) => void
}

function Cliques({ ativo, onPonto }: { ativo: boolean; onPonto: Props['onPonto'] }) {
  useMapEvents({ click: e => { if (ativo) onPonto([e.latlng.lat, e.latlng.lng]) } })
  return null
}

export function MapaTalhao({ camada, pontos, fechado, desenhando, fundo, talhoes = [], onEscolher, onPonto, onMapa }: Props) {
  const c = CAMADAS[camada]
  const traco = { color: VERDE, weight: 3, fillColor: VERDE }
  return (
    <MapContainer
      ref={onMapa}
      className={`ob-mapa${desenhando ? ' ob-desenhando' : ''}`}
      center={[VISTA_INICIAL.lat, VISTA_INICIAL.lon]}
      zoom={VISTA_INICIAL.zoom}
      zoomControl={false}
    >
      <TileLayer key={camada} url={c.url} attribution={c.attribution} maxZoom={19} />
      <Cliques ativo={desenhando} onPonto={onPonto} />
      {talhoes.filter(t => t.contorno.length >= 3).map(t => (
        <Polygon key={t.id} positions={t.contorno} interactive={!desenhando && !!onEscolher}
          pathOptions={{ color: VERDE, weight: t.ativo ? 3 : 2, fillColor: VERDE, fillOpacity: t.ativo ? 0.28 : 0.1, dashArray: t.ativo ? undefined : '6 4' }}
          eventHandlers={{ click: () => onEscolher?.(t.id) }}>
          <Tooltip permanent direction="center" className="ob-tt">{t.nome}</Tooltip>
        </Polygon>
      ))}
      {fundo && fundo.length >= 3 && (
        <Polygon positions={fundo} pathOptions={{ color: VERDE, weight: 2, dashArray: '4 4', fillColor: VERDE, fillOpacity: 0.06, opacity: 0.6 }} interactive={false} />
      )}
      {pontos.length >= 3 || (fechado && pontos.length >= 2)
        ? <Polygon positions={pontos} pathOptions={{ ...traco, dashArray: fechado ? undefined : '8 6', fillOpacity: fechado ? 0.2 : 0.08 }} interactive={false} />
        : pontos.length === 2 && <Polyline positions={pontos} pathOptions={{ ...traco, dashArray: '8 6' }} interactive={false} />}
      {pontos.map((p, i) => (
        <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: VERDE, weight: 3, fillColor: '#fff', fillOpacity: 1 }} interactive={false} />
      ))}
    </MapContainer>
  )
}
