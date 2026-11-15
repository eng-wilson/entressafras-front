import { criarSimulacao, ROTACOES, CLASSES_SOLO, CULTURAS, soloLocal, fonteSintetica, estadoDecendio, medidorVertical } from '../index.js';

const $ = id => document.getElementById(id);
const fonte = fonteSintetica({ sementeBase: 2024, anos: 2 });
const solo = soloLocal();
const classeId = 'latossolo_vermelho';
const cena = criarSimulacao($('cena'), {
    altura: 'min(70vh, 600px)',
    aoIndicador: id => { $('status').textContent = `Indicador selecionado: ${id}.`; }
});
let safra;
for (const [id, r] of Object.entries(ROTACOES)) $('rotacao').add(new Option(r.nome ?? id, id));

function atualizarDia() {
    const dia = Number($('dia').value);
    cena.dia(dia);
    $('valor-dia').value = dia;
    const tx = safra.clima.tmax[dia], tn = safra.clima.tmin[dia], chuva = safra.clima.chuva[dia];
    // O modelo do HUD recebe o estado real do intervalo mostrado; aqui o intervalo é um dia.
    const ks = safra.serie[dia].ks;
    const agua = { k: ks < .45 ? 'risk' : ks < .55 ? 'warn' : 'good', t: `${Math.round(100 * ks)}% da demanda`, p: 'Atendimento hídrico do dia simulado' };
    const limite = CULTURAS[safra.cultura].limites;
    const temp = { k: tx >= limite.tCalor ? 'risk' : tx >= limite.tCalor - 4 ? 'warn' : 'good', t: `${tn.toFixed(0)}–${tx.toFixed(0)} °C`, p: 'Temperatura do dia simulado' };
    const periodo = estadoDecendio({ safra, datas: [safra.clima.datas?.[dia] ?? safra.clima.data[dia]], agua, temp, semCultura: false, periodo: `Dia ${dia}` });
    cena.indicadores(periodo.sinais);
    const fragmento = document.createElement('template');
    fragmento.innerHTML = medidorVertical({ rotulo: 'Chuva', icone: 'i-drop', valor: Math.round(chuva), unidade: 'mm', hi: 80, aria: 'Chuva do dia' })
        + medidorVertical({ rotulo: 'Temperatura', icone: 'i-therm', valor: Math.round(tx), unidade: '°C', tipo: 'temp', lo: 0, hi: 50, de: tn, ate: tx, aria: 'Temperatura do dia' });
    cena.medidores(...fragmento.content.children);
    $('status').textContent = `${safra.nome} · dia ${dia} · clima sintético`;
}

function mostrar() {
    try {
        const id = $('rotacao').value;
        safra = cena.mostrar({ rotacao: { id, ...ROTACOES[id] }, ano: 2024, posicao: 0, classe: CLASSES_SOLO[classeId], classeId, solo, soloChave: 'exemplo', fonte, fonteChave: 'sintetico' });
        // As datas MM-DD identificam os dias deste ciclo sintético, sem requerer dados NASA.
        safra.clima.datas ??= safra.clima.data;
        $('dia').max = CULTURAS[safra.cultura].cicloDias;
        $('dia').value = Math.round(Number($('dia').max) * .5);
        atualizarDia();
        document.body.dataset.simulacao = 'pronta';
    } catch (erro) {
        document.body.dataset.simulacao = 'erro';
        $('status').textContent = erro.message;
        console.error(erro);
    }
}
$('rotacao').addEventListener('change', mostrar);
$('dia').addEventListener('input', atualizarDia);
window.addEventListener('pagehide', () => cena.destruir(), { once: true });
mostrar();
