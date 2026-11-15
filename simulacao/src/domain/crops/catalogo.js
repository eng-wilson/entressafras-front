import milho from './milho.js';
import sorgo from './sorgo.js';
import milheto from './milheto.js';
import trigo from './trigo.js';
import arroz from './arroz.js';
import soja from './soja.js';
import feijao from './feijao.js';
import { variantesBrizantha } from './brizantha.js';
import ruziziensis from './ruziziensis.js';
import juncea from './crotalaria-juncea.js';
import spectabilis from './crotalaria-spectabilis.js';
import ochroleuca from './crotalaria-ochroleuca.js';
import algodao from './algodao.js';

export const CULTURAS = Object.fromEntries([
    milho, sorgo, milheto, trigo, arroz, soja, feijao, ...Object.values(variantesBrizantha), ruziziensis,
    juncea, spectabilis, ochroleuca, algodao
].map(c => [c.id, c]));
