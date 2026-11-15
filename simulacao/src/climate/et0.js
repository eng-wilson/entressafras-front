// Evapotranspiração de referência (ET0), FAO-56 (Allen et al., 1998, cap. 3), passo diário.
//   et0PenmanMonteith: equação 6, com Rs medido (POWER ALLSKY_SFC_SW_DWN), umidade relativa média e vento a 2 m;
//   et0Hargreaves: equação 52, quando falta umidade ou vento;
//   radiacaoExtraterrestre: equação 21 (Ra, MJ/m²/dia) pela latitude e pelo dia do ano.
// Puro: sem rede, sem DOM.

const GSC = 0.0820;   // constante solar, MJ/m²/min

export function radiacaoExtraterrestre(latGraus, diaDoAno) {
    const phi = latGraus * Math.PI / 180;
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * diaDoAno / 365);
    const delta = 0.409 * Math.sin(2 * Math.PI * diaDoAno / 365 - 1.39);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
    return 24 * 60 / Math.PI * GSC * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

const esat = t => 0.6108 * Math.exp(17.27 * t / (t + 237.3));   // kPa, eq. 11

export function et0PenmanMonteith({ tmax, tmin, ur, vento, rad, elev, lat, diaDoAno }) {
    const tmed = (tmax + tmin) / 2;
    const P = 101.3 * Math.pow((293 - 0.0065 * elev) / 293, 5.26);            // eq. 7
    const gama = 0.000665 * P;                                               // eq. 8
    const delta = 4098 * esat(tmed) / Math.pow(tmed + 237.3, 2);             // eq. 13
    const es = (esat(tmax) + esat(tmin)) / 2;                                // eq. 12
    const ea = Math.min(es, ur / 100 * es);                                  // eq. 19 (UR média)
    const Ra = radiacaoExtraterrestre(lat, diaDoAno);
    const Rso = (0.75 + 2e-5 * elev) * Ra;                                   // eq. 37
    const Rs = Math.min(rad, Rso);
    const Rns = (1 - 0.23) * Rs;                                             // eq. 38, albedo 0,23
    const sigma = 4.903e-9;
    const Rnl = sigma * (Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2
        * (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) * (1.35 * (Rso > 0 ? Rs / Rso : 1) - 0.35);   // eq. 39
    const Rn = Rns - Rnl;
    const et0 = (0.408 * delta * Rn + gama * 900 / (tmed + 273) * vento * (es - ea)) / (delta + gama * (1 + 0.34 * vento));
    return Math.max(0, et0);
}

export function et0Hargreaves({ tmax, tmin, lat, diaDoAno }) {
    const Ra = radiacaoExtraterrestre(lat, diaDoAno) * 0.408;   // mm/dia equivalente
    return Math.max(0, 0.0023 * Ra * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));
}

export function diaDoAnoISO(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
}
