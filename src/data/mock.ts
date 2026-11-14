// TMIN, TMAX e THIS_RAIN alimentam apenas testes e a fixture de clima.
// Temperaturas mínimas por décimo (setembro décimo 0 → agosto décimo 35)
export const TMIN = [19,19,19,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,20,20,20,17,17,17,15,15,15,14,14,14,15,15,15]
export const TMAX = [35,35,34,33,32,31,30,30,30,29,29,29,29,29,30,29,29,29,30,30,30,30,31,31,31,31,31,31,31,32,32,33,33,34,34,35]

// Umidade do solo — rotação r4 (soja/milho safrinha), com cultura
export const WAT2: Record<number, number> = {5:.66,6:.64,7:.58,8:.56,9:.52,10:.48,11:.44,12:.41,13:.46,14:.5,15:.55,16:.62,17:.64,18:.6,19:.58,20:.55,21:.5,22:.47,23:.45,24:.44,25:.43,26:.45,27:.48,28:.5}

// Umidade do solo — sem cultura (pousio/palhada)
export const SOIL: Record<number, number> = {0:.32,1:.30,2:.34,3:.40,4:.48,29:.42,30:.38,31:.35,32:.33,33:.31,34:.30,35:.30}

// Chuva mensal atual (set→ago)
export const THIS_RAIN = [45,150,180,230,200,280,250,120,40,10,5,15]

// Chuva mensal histórica (normal)
export const USUAL_RAIN = [40,130,220,280,250,180,80,40,15,10,15,25]

export type StageKey = 'bare'|'ready'|'seed'|'emerg'|'veg'|'flor'|'ench'|'mat'|'straw'
export type Stage = { crop: 'soja'|'milho'|null; k: StageKey; name: string; from: number; to: number }

// Estágios fenológicos da rotação r4 (Soja → Milho safrinha)
export const STAGES: Stage[] = [
  { crop: null,    k: 'bare',  name: 'Pousio',                       from: 0,  to: 3  },
  { crop: null,    k: 'ready', name: 'Solo pronto para o plantio',    from: 4,  to: 4  },
  { crop: 'soja',  k: 'seed',  name: 'Semeadura',                     from: 5,  to: 5  },
  { crop: 'soja',  k: 'emerg', name: 'Germinação e emergência',       from: 6,  to: 6  },
  { crop: 'soja',  k: 'veg',   name: 'Crescimento',                   from: 7,  to: 8  },
  { crop: 'soja',  k: 'flor',  name: 'Floração',                      from: 9,  to: 10 },
  { crop: 'soja',  k: 'ench',  name: 'Enchimento de grãos',           from: 11, to: 12 },
  { crop: 'soja',  k: 'mat',   name: 'Pronta para colher',            from: 13, to: 14 },
  { crop: 'soja',  k: 'straw', name: 'Colheita',                      from: 15, to: 15 },
  { crop: 'milho', k: 'seed',  name: 'Semeadura',                     from: 16, to: 16 },
  { crop: 'milho', k: 'emerg', name: 'Germinação e emergência',       from: 17, to: 17 },
  { crop: 'milho', k: 'veg',   name: 'Crescimento',                   from: 18, to: 20 },
  { crop: 'milho', k: 'flor',  name: 'Floração',                      from: 21, to: 22 },
  { crop: 'milho', k: 'ench',  name: 'Enchimento de grãos',           from: 23, to: 25 },
  { crop: 'milho', k: 'mat',   name: 'Pronto para colher',            from: 26, to: 27 },
  { crop: 'milho', k: 'straw', name: 'Colheita',                      from: 28, to: 28 },
  { crop: null,    k: 'straw', name: 'Palhada',                       from: 29, to: 31 },
  { crop: null,    k: 'bare',  name: 'Pousio',                        from: 32, to: 35 },
]

// Histórico climático: [anos com água suficiente em 10, nome da cultura]
export const FREQ: Record<string, [number, string][]> = {
  r1: [[8, 'soja']],
  r2: [[7, 'soja'], [7, 'sorgo']],
  r3: [[8, 'soja precoce'], [5, 'milho']],
  r4: [[3, 'soja'], [5, 'milho safrinha']],
}

// Scores por critério (menor = melhor); índice = rotação 0–3
export const SCORE: Record<string, number[]> = {
  risco: [5, 8, 10, 15],
  agua:  [-8, -7, -6.5, -4],
  solo:  [0, 60, 10, 110],
  prod:  [-58, -120, -160, -150],
}

export type CTRow = {
  c1: string; c2: string; f1: number; f2: number | null
  w1: string; w2: string; soil: string; soilWhy: string
  pest: string; pestWhy: string
  y1: string; y2: string; p1l: string; p1: string; p2l: string; p2: string
  atual?: boolean
}
export const CT: CTRow[] = [
  { c1:'Soja', c2:'Crotalária + milheto', f1:8, f2:null, w1:'450–800 mm', w2:'Sem dado', soil:'Melhora', soilWhy:'Fixa nitrogênio e cobre o solo', pest:'Menor risco', pestWhy:'A crotalária não hospeda as principais pragas e nematoides da soja.', y1:'58', y2:'-', p1l:'Soja', p1:'R$ 152,45', p2l:'Crotalária + milheto', p2:'Não é vendida' },
  { c1:'Soja', c2:'Sorgo',                f1:7, f2:7,    w1:'450–800 mm', w2:'~450 mm',  soil:'Mantém', soilWhy:'A palhada do sorgo protege o solo', pest:'Menor risco', pestWhy:'O sorgo não hospeda as principais pragas da soja.', y1:'58', y2:'62', p1l:'Soja', p1:'R$ 152,45', p2l:'Sorgo', p2:'R$ 44,00' },
  { c1:'Soja precoce', c2:'Milho + braquiária', f1:8, f2:5, w1:'450–800 mm', w2:'380–550 mm', soil:'Melhora', soilWhy:'Raízes e palha da braquiária', pest:'Maior risco', pestWhy:'Soja e milho em sequência: pragas como o percevejo passam de uma para a outra.', y1:'55', y2:'105', p1l:'Soja', p1:'R$ 152,45', p2l:'Milho', p2:'R$ 66,60' },
  { c1:'Soja', c2:'Milho safrinha', f1:3, f2:5, w1:'450–800 mm', w2:'380–550 mm', soil:'Mantém', soilWhy:'Solo descoberto por 4 meses', pest:'Maior risco', pestWhy:'Repete soja e milho da safra anterior: as pragas continuam no talhão.', y1:'52', y2:'98', p1l:'Soja', p1:'R$ 152,45', p2l:'Milho', p2:'R$ 66,60', atual:true },
]

export const MONTHS = ['setembro','outubro','novembro','dezembro','janeiro','fevereiro','março','abril','maio','junho','julho','agosto']
export const MONTHS_SHORT = ['Set','Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago']
export const LEN = [30,31,30,31,31,28,31,30,31,30,31,31]
