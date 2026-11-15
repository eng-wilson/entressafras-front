// Recorta a prancha aprovada sem repintar a arte e usa a mesma máscara do jogo.
// Uso: node scripts/preparar-arroz.mjs [caminho-do-Edge]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const raiz = resolve(import.meta.dirname, '..');
const pasta = resolve(raiz, 'assets/sprites/arroz');
const scratch = resolve(raiz, 'scratch/arroz');
await mkdir(scratch, { recursive: true });
const pagina = `<!doctype html><meta charset="utf-8"><style>
body{background:#283328;color:#fff;font:16px sans-serif}section{display:flex;align-items:end;gap:20px}canvas{max-width:260px;max-height:380px}figure{margin:8px}figcaption{text-align:center}</style>
<h1>Arroz — arte e máscara usada pelo jogo</h1><section id="arte"></section><section id="mascaras"></section>
<script>for(const tipo of ['error','unhandledrejection'])window.addEventListener(tipo,e=>{document.body.append(String(e.message||e.reason));fetch('/erro',{method:'POST',body:String(e.message||e.reason)});});</script>
<script type="module">
import crop from '/src/domain/crops/arroz.js';
import { spriteDeImagens } from '/src/render/sprites/mask.js';
import { createSpriteSet, nomeSprite } from '/src/render/sprites/manifest.js';
import { createCompositor } from '/src/render/sprites/symptoms.js';
import { IDX, NCANAIS, P } from '/src/domain/channels.js';
import { createLavoura } from '/src/render/field/lavoura.js';
const img = new Image(); await new Promise((ok,erro)=>{img.onload=ok;img.onerror=erro;img.src='/assets/sprites/arroz/arroz_fases_progresso.png';});
// Limites dos cinco recortes na prancha; a margem final é calculada pelo alpha.
const cortes = [ ['PL',0,160], ['PER',160,468], ['EMB',468,778], ['FL',778,1126], ['M',1126,1536] ];
const sprites = {}; const resumo = []; const bases = new Map();
function alturaDaFase(fase) {
 const u=Math.min(1,Math.max(0,(fase.t-crop.janelas.altura[0])/(crop.janelas.altura[1]-crop.janelas.altura[0])));
 const hMed=(crop.morfologia.alturaMax[0]+crop.morfologia.alturaMax[1])/2;
 return hMed*u*u*(3-2*u)+.12;
}
async function salvar(nome, canvas) {
 const blob = await new Promise(r => canvas.toBlob(r));
 const resposta = await fetch('/salvar/'+nome, {method:'POST',body:blob});
 if (!resposta.ok) throw Error('Falha ao salvar '+nome);
}
function mostrar(canvas, texto, grupo) {
 const f=document.createElement('figure'), l=document.createElement('figcaption');
 l.textContent=texto; f.append(canvas,l); document.getElementById(grupo).append(f);
}
for (const [id,x0,x1] of cortes) {
 const c=document.createElement('canvas'); c.width=x1-x0;c.height=img.height;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,-x0,0);
 const px=ctx.getImageData(0,0,c.width,c.height).data;
 let minX=c.width,minY=c.height,maxX=0,maxY=0;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(px[(y*c.width+x)*4+3]>16){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 const recorte=document.createElement('canvas');recorte.width=maxX-minX+9;recorte.height=maxY-minY+9;
 recorte.getContext('2d').drawImage(c,minX,minY,maxX-minX+1,maxY-minY+1,4,4,maxX-minX+1,maxY-minY+1);
 // Centro do colo: média dos pixels opacos nos últimos 10 px da planta.
 const dados=recorte.getContext('2d').getImageData(0,0,recorte.width,recorte.height).data;
 let soma=0,n=0;for(let y=recorte.height-14;y<recorte.height-4;y++)for(let x=0;x<recorte.width;x++)if(dados[(y*recorte.width+x)*4+3]>128){soma+=x;n++;}
 if(!n)throw Error('Colo ausente: '+id);
 const ancora=[Math.round(soma/n),recorte.height-5];
 const fase=crop.sprites.fases.find(f=>f.id===id);
 const altura=alturaDaFase(fase);
 const resolucao=Math.round((maxY-minY)/altura);
 const s=spriteDeImagens(recorte,null,{ancora,res:resolucao,maturacao:fase.maturacao??0,semBranco:true});
 const mask=document.createElement('canvas');mask.width=s.larg;mask.height=s.alt;
 mask.getContext('2d').putImageData(new ImageData(s.dadosPx,s.larg,s.alt),0,0);
 await salvar(id+'.png',s.cor);await salvar(id+'.dados.png',mask);
 bases.set(id,{cor:id+'.png',dados:id+'.dados.png',ancora,resolucao,altura});
 let folhas=0;for(let i=0;i<s.dadosPx.length;i+=4)if(s.dadosPx[i+3]&&(s.dadosPx[i+2]>>5)===1)folhas++;
 if(!folhas)throw Error('Sem folhas na máscara: '+id);
 resumo.push({id,larg:s.larg,alt:s.alt,ancora,resolucao,folhas});
 mostrar(s.cor,id,'arte');mostrar(mask,id+' — dados','mascaras');
}
// Todas as variantes normais usam a arte. O talhão já varia escala, direção e
// balanço por planta. IP reutiliza o vegetativo; GP, a panícula já formada.
// A resolução por fase mantém a altura contínua nas trocas de imagem.
const origemPorFase={IP:'EMB',GP:'FL'};
for(let k=0;k<crop.sprites.fases.length;k++){
 const fase=crop.sprites.fases[k],base=bases.get(origemPorFase[fase.id]??fase.id);
 const {altura,...meta}=base;
 const resolucao=Math.round(base.resolucao*altura/alturaDaFase(fase));
 for(let v=0;v<3;v++)sprites[nomeSprite(crop,k,0,0,v)]={...meta,resolucao};
}
await fetch('/manifesto',{method:'POST',body:JSON.stringify({sprites},null,2)+'\\n'});
const set=createSpriteSet(crop);
// Simula o primeiro quadro antes da resposta do carregamento assíncrono.
set.obter(3,1,0,0);
const carregados=await set.carregarArte();
if(carregados!==21)throw Error('Arte carregada: '+carregados);
for(let k=0;k<crop.sprites.fases.length;k++)for(let p=0;p<3;p++)for(let e=0;e<3;e++)for(let v=0;v<3;v++){
 const s=set.obter(k,p,e,v);if(!s.larg||s.corPx.length!==s.dadosPx.length)throw Error('Sprite inválido');
 if(!s.chave.startsWith('arte:'))throw Error('Combinação sem arte: '+s.chave);
 if(p>0||e>0&&crop.sprites.fases[k].inflorescencia){
  const normal=set.obter(k,0,0,v);
  if(s.cor===normal.cor||s.dadosPx===normal.dadosPx)throw Error('Estado sem adaptação visual: '+s.chave);
 }
}
// Regressão do problema observado: todas as plantas sorteadas no talhão devem
// encontrar arte em cada fase, e não só as plantas que sortearam variante 0.
const lavoura=createLavoura(crop,{width:4.2,depth:4.2});await lavoura.sprites.carregarArte();
const reg=new Float32Array(lavoura.plants.length*P.STRIDE);
for(let i=0;i<lavoura.plants.length;i++){reg[i*P.STRIDE+P.CRESC]=1;reg[i*P.STRIDE+P.ESPIGA]=1;}
let plantasVerificadas=0;
for(const fase of crop.sprites.fases){
 lavoura.atualizar(fase.t,reg,{modo:'real',ganho:1});
 for(const planta of lavoura.plants){
  if(!planta.vis?.spr.chave.startsWith('arte:'+fase.id+'_normal'))throw Error('Planta sem arte: '+fase.id+'/'+planta.variante);
  plantasVerificadas++;
 }
}
// Posturas agudas e aborto também precisam manter a arte, após a fila terminar.
for(const postura of [.45,.9])for(const espiga of [1,.6,.2]){
 for(let i=0;i<lavoura.plants.length;i++){reg[i*P.STRIDE+P.AGUDO+IDX.agua_deficit]=postura;reg[i*P.STRIDE+P.ESPIGA]=espiga;}
 for(const fase of crop.sprites.fases){
  lavoura.atualizar(fase.t,reg,{modo:'real',ganho:1});
  let tentativas=0;while(lavoura.pendentes&&tentativas++<200)lavoura.processarFila(100);
  if(lavoura.pendentes)throw Error('Fila não terminou: '+fase.id);
  for(const planta of lavoura.plants){
   if(!planta.vis?.spr.chave.startsWith('arte:'))throw Error('Arte perdida sob estresse: '+fase.id);
   plantasVerificadas++;
  }
 }
}
const grupo=document.createElement('section');grupo.id='sintomas';document.body.append(grupo);
const compositor=createCompositor(), referencia=set.obter(3,0,0,0);
for(const canal of ['N','S','K','agua_deficit']){
 const ag=new Float32Array(NCANAIS),cr=new Float32Array(NCANAIS);ag[IDX[canal]]=cr[IDX[canal]]=.85;
 const sintoma=compositor.compor(referencia,{modo:'real',ag,cr,ganho:1,senesc:0});
 const px=sintoma.getContext('2d').getImageData(0,0,sintoma.width,sintoma.height).data;
 if(!px.some((v,i)=>i%4!==3&&v!==referencia.corPx[i]))throw Error('Sintoma sem efeito: '+canal);
 mostrar(sintoma,canal+' — 0,85','sintomas');
}
await fetch('/resultado',{method:'POST',body:JSON.stringify({carregados,total:set.total,plantasVerificadas,sintomas:['N','S','K','agua_deficit'],recortes:resumo})});
document.title='OK';
</script>`;
let resultado;
const servidor = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (req.method === 'POST') {
            const partes = []; for await (const p of req) partes.push(p);
            const body = Buffer.concat(partes);
            if (/^\/salvar\/(PL|PER|EMB|FL|M)(\.dados)?\.png$/.test(url.pathname)) {
                await writeFile(resolve(pasta, url.pathname.split('/').pop()), body);
            } else if (url.pathname === '/manifesto') await writeFile(resolve(pasta, 'manifest.json'), body);
            else if (url.pathname === '/resultado') resultado = JSON.parse(body);
            else if (url.pathname === '/erro') console.error(body.toString());
            else throw Error('Destino inválido');
            res.end('ok'); return;
        }
        if (url.pathname === '/preparar') { res.setHeader('Content-Type', 'text/html'); res.end(pagina); return; }
        const arquivo = resolve(raiz, '.' + decodeURIComponent(url.pathname));
        if (!arquivo.startsWith(raiz + sep)) throw Error('Caminho inválido');
        res.setHeader('Content-Type', ({'.js':'text/javascript','.json':'application/json','.png':'image/png'})[extname(arquivo)] ?? 'text/html');
        res.end(await readFile(arquivo));
    } catch (e) { res.statusCode = 500; res.end(e.message); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
try {
    const edge = process.argv[2] ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    await promisify(execFile)(edge, ['--headless','--disable-gpu','--no-first-run',
        '--user-data-dir='+resolve(scratch,'perfil'),'--virtual-time-budget=30000',
        '--window-size=1600,1600','--screenshot='+resolve(scratch,'galeria.png'),
        'http://127.0.0.1:'+servidor.address().port+'/preparar'], {timeout:60000});
    if (!resultado) throw Error('Preparação incompleta; confira scratch/arroz/galeria.png');
    console.log(JSON.stringify(resultado, null, 2));
} finally { servidor.close(); }
