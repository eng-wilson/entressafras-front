// Cabeçalho, seletor de idioma e cena da simulação (src/sim/cena.ts e o talhão da simulacao/).
export const EN_BASE: Record<string, string> = {
  'Idioma': 'Language',
  'Como funciona': 'How it works',
  'Simulação do talhão. Arraste para mover, use mais e menos para zoom e zero para restaurar.': 'Field simulation. Drag to move, use plus and minus to zoom and zero to reset.',
  'Zoom da simulação': 'Simulation zoom',
  'Afastar': 'Zoom out',
  'Restaurar enquadramento': 'Reset view',
  'Aproximar': 'Zoom in',
  'Seca intensa': 'Severe drought',
  'Estresse por seca ou calor': 'Drought or heat stress',
  'Chuva intensa': 'Heavy rain',
  'Chuva': 'Rain',
  'Sem chuva': 'No rain',
  'Talhão simulado: {estado}, {chuva} mm de chuva no dia. Arraste para mover; mais e menos para zoom; zero para restaurar.': 'Simulated field: {estado}, {chuva} mm of rain on the day. Drag to move; plus and minus to zoom; zero to reset.',
  // Textos que o backend de clima devolve em português (app/schemas/clima.py), traduzidos na exibição.
  // Se o backend mudar a redação, a chave deixa de casar e o texto aparece como veio: conferir aqui.
  'Dados do NASA POWER numa grade de ~50 km (0,5° × 0,625°): o resultado vale para a região, não para o talhão. Talhões vizinhos caem na mesma célula.':
    'NASA POWER data on a ~50 km grid (0.5° × 0.625°): the result applies to the region, not to the field. Neighboring fields fall in the same cell.',
  'NASA POWER (comunidade AG), série diária; ET0 FAO-56 Penman-Monteith': 'NASA POWER (AG community), daily series; FAO-56 Penman-Monteith ET0',
  'NASA SMAP L4 (SPL4SMGP v8) via Google Earth Engine, pixel de ~11 km: modelo GEOS Catchment com assimilação das observações do satélite SMAP; médias diárias no fuso de MT.':
    'NASA SMAP L4 (SPL4SMGP v8) via Google Earth Engine, ~11 km pixel: GEOS Catchment model assimilating SMAP satellite observations; daily means in the MT time zone.',
}
