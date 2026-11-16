// Componentes da área central e da cena (src/components, exceto o painel direito).
export const EN_COMPONENTES: Record<string, string> = {
  // RotationsHeader
  'Rotações': 'Rotations',
  'Safra {ano} · na ordem recomendada': 'Season {ano} · in recommended order',
  'Criar minha rotação': 'Create my rotation',
  'Modo de visualização': 'View mode',
  'Calendário': 'Calendar',
  'Comparação': 'Comparison',

  // AvisoClima
  'Alguns dados não carregaram.': 'Some data did not load.',
  'Tentar de novo': 'Try again',

  // Folha
  'Cancelar': 'Cancel',
  'Salvar': 'Save',

  // CalendarRows
  'Rotações de cultura': 'Crop rotations',
  'Comparar {a} depois {b}': 'Compare {a} then {b}',
  '{a} depois {b}. Tirar da comparação': '{a} then {b}. Remove from comparison',
  '{a} depois {b}. Comparar': '{a} then {b}. Compare',
  '{a} depois {b}. Selecionar e ver o período que mais pesa: {periodo}': '{a} then {b}. Select and see the period that weighs most: {periodo}',
  '{a} depois {b}. Selecionar': '{a} then {b}. Select',
  'depois': 'then',
  'Atual': 'Current',
  'Seu último plantio': 'Your last planting',
  'A última rotação do histórico do talhão, para comparar com as sugestões.': 'The latest rotation in this field’s history, to compare with the suggestions.',
  'Sugestões para o seu talhão': 'Suggestions for your field',
  'Nova': 'New',
  'Mais pragas': 'More pests',
  'Remover a rotação salva {a} depois {b}': 'Remove the saved rotation {a} then {b}',
  'Remover': 'Remove',
  '{texto} Clique para ver na simulação.': '{texto} Click to see it in the simulation.',
  'Período crítico. {texto} Ver na simulação.': 'Critical period. {texto} See it in the simulation.',
  'Período crítico: fase com o maior déficit de água. Clique para ver na simulação.':
    'Critical period: the phase with the largest water deficit. Click to see it in the simulation.',

  // HistoricoModal
  'Histórico do {talhao}': '{talhao} history',
  'Safras, da mais antiga para a atual': 'Seasons, from oldest to current',
  'Registrar safra {safra}': 'Record season {safra}',
  'Mais antiga': 'Older',
  'Safra {safra}, {status}': 'Season {safra}, {status}',
  'Safra {safra}, planejando agora': 'Season {safra}, planning now',
  'Planejando': 'Planning',
  'Safra {safra}': 'Season {safra}',
  'Completa. Produtividade e pragas são opcionais.': 'Complete. Productivity and pests are optional.',
  'Escolha a cultura das duas safras': 'Choose the 1st and 2nd crop',
  'Igual a {safra}': 'Same as {safra}',
  'Próxima: {safra}': 'Next: {safra}',
  'Registrar {safra}': 'Record {safra}',

  // IsoField
  'Pronto para o plantio': 'Ready for planting',
  'Talhão em {periodo}: {estado}': 'Field in {periodo}: {estado}',
  'Preparando a simulação…': 'Preparing the simulation…',
  'Simulando a rotação…': 'Simulating the rotation…',
  'Não foi possível desenhar o talhão.': 'Could not draw the field.',
  '{estado}. Período crítico: {rotulo}. {texto}': '{estado}. Critical period: {rotulo}. {texto}',
  'Período crítico': 'Critical period',

  // MonthStrip
  ', temperatura fora dos limites da cultura': ', temperature outside the crop limits',
  'Plantio em {periodo}: {classe}{temp}; dentro da data usual da região': 'Planting on {periodo}: {classe}{temp}; within the usual date for the region',
  'Plantio em {periodo}: {classe}{temp}; fora da data usual da região': 'Planting on {periodo}: {classe}{temp}; outside the usual date for the region',
  ', período que mais pesa no clima da rotação': ', period that weighs most in the rotation climate',
  ', chuva sem dado': ', no rain data',
  ', {chuva}, {mm} milímetros no decêndio': ', {chuva}, {mm} millimeters in the 10-day period',
  ', de {min} a {max} graus': ', from {min} to {max} degrees',
  'sem dado': 'no data',
  '{mes}: {chuva}': '{mes}: {chuva}',
  '{mes}: {chuva}, {mm} mm no mês': '{mes}: {chuva}, {mm} mm in the month',
  '{mes}: {chuva}, {mm} milímetros no mês': '{mes}: {chuva}, {mm} millimeters in the month',
  'Arraste para simular um período': 'Drag to simulate a period',

  // RainGauge
  'Sem dado': 'No data',
  'Chuva do decêndio: carregando': '10-day rain: loading',
  'Chuva do decêndio: sem dado': '10-day rain: no data',
  'Chuva do decêndio: {mm} milímetros, {chuva}': '10-day rain: {mm} millimeters, {chuva}',
  'Chuva do decêndio': '10-day rain',

  // Rotations
  'Calendário e comparação das rotações': 'Rotation calendar and comparison',

  // Sidebar
  'Média de {n} safras, NASA POWER': 'Average of {n} seasons, NASA POWER',
  'Arenoso': 'Sandy',
  'Médio': 'Medium',
  'Argiloso': 'Clayey',
  '{textura} (estimado)': '{textura} (estimated)',
  'Estimado a partir do local (SoilGrids): {mm} mm de água por metro de raiz. Editar o solo do talhão':
    'Estimated from the location (SoilGrids): {mm} mm of water per meter of root. Edit the field soil',
  'Redesenhar o contorno do talhão': 'Redraw the field outline',
  'Solo': 'Soil',
  'Editar o solo do talhão': 'Edit the field soil',
  'Histórico': 'History',
  'Registrar': 'Record',
  'Registrar as safras anteriores': 'Record previous seasons',
  'Chuva no ano': 'Rain in the year',
  'Local': 'Location',
  'Ajustes': 'Settings',
  'Talhão': 'Field',
  'Trocar de talhão ou adicionar um novo': 'Switch fields or add a new one',
  'O que importa': 'What matters',
  'A ordem das rotações segue o que você marcar. Faturamento é uma estimativa com médias nacionais (FAO), sem custos.':
    'The rotation order follows what you select. Revenue is an estimate from national averages (FAO), without costs.',

  // Simulation
  'Comparação das rotações marcadas': 'Comparison of the selected rotations',
  'Resumo do período simulado': 'Summary of the simulated period',
  'Comparando': 'Comparing',
  '{n} rotação · safra {ano}': '{n} rotation · season {ano}',
  '{n} rotações · safra {ano}': '{n} rotations · season {ano}',
  'avaliadas no ciclo completo, de setembro a agosto': 'assessed over the full cycle, September to August',
  'Simulando': 'Simulating',
  'Seu talhão': 'Your field',

  // SoilMoistureBar
  'Água para a cultura': 'Water for the crop',

  // SoloModal
  'Solo do talhão': 'Field soil',
  'Nome': 'Name',
  'Escolha a textura para salvar.': 'Choose the texture to save.',
  'Localização': 'Location',
  'Mudar no mapa': 'Change on the map',
  'Redesenhar o contorno muda a localização e a área. Solo e histórico continuam.':
    'Redrawing the outline changes the location and area. Soil and history are kept.',

  // TempRangeBar
  'Temperatura: carregando': 'Temperature: loading',
  'Temperatura': 'Temperature',
  'a': 'to',
  'mínima e máxima do decêndio': '10-day minimum and maximum',
  // Cenário de clima
  'Clima': 'Climate',
  'Cenários de clima futuro: usamos os 30 anos reais ajustados pelas projeções climáticas (+temperatura, −chuva). Não é uma previsão do próximo ano.':
    'Future climate scenarios: the 30 observed years adjusted by climate projections (+temperature, −rainfall). Not a forecast for next year.',
  'Recalculando o risco para o cenário {cenario}…': 'Recalculating the risk for the {cenario} scenario…',
  'O cenário climático não está disponível; mostrando o clima atual.': 'The climate scenario is not available; showing the current climate.',
}
