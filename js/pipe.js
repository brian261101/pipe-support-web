/* Tải trọng đường ống và khoảng cách gối đỡ.
   Đơn vị nội bộ: mm, N, MPa. */
(function (root) {
  'use strict';
  const G = root.PSAT.data.GRAVITY;

  function pipeLoad(OD, t, rhoPipe, rhoFluid, tIns, rhoIns, corrosion, extraKgPerM) {
    tIns = tIns || 0; rhoIns = rhoIns || 0;
    corrosion = corrosion || 0; extraKgPerM = extraKgPerM || 0;
    if (OD <= 0 || t <= 0 || OD <= 2 * t)
      throw new Error('Kích thước ống không hợp lệ: cần OD > 2t > 0.');

    const ID = OD - 2 * t;
    const tc = Math.max(t - corrosion, 1e-6);
    if (OD <= 2 * tc) throw new Error('Chiều dày sau ăn mòn không hợp lệ.');
    const IDc = OD - 2 * tc;

    // Khối lượng tính theo chiều dày DANH NGHĨA, nhưng độ bền (A, I, Z) tính
    // theo chiều dày ĐÃ TRỪ ăn mòn — thiên về an toàn ở cả hai phía.
    const Anom = Math.PI / 4 * (OD * OD - ID * ID);
    const wPipe = Anom * 1e-6 * rhoPipe * G / 1000;
    const wFluid = Math.PI / 4 * ID * ID * 1e-6 * rhoFluid * G / 1000;

    let wIns = 0;
    if (tIns > 0 && rhoIns > 0) {
      const ODi = OD + 2 * tIns;
      wIns = Math.PI / 4 * (ODi * ODi - OD * OD) * 1e-6 * rhoIns * G / 1000;
    }
    const wExtra = extraKgPerM * G / 1000;

    const Ametal = Math.PI / 4 * (OD * OD - IDc * IDc);
    const I = Math.PI / 64 * (OD ** 4 - IDc ** 4);
    const Z = I / (OD / 2);

    const o = {
      wPipe, wFluid, wIns, wExtra, OD, ID, tCorroded: tc, Ametal, I, Z,
      get wTotal() { return wPipe + wFluid + wIns + wExtra; },
      kgPerM: function (w) { return w * 1000 / G; }
    };
    o.breakdown = function () {
      const rows = [
        ['Ống (thép)', wPipe], ['Môi chất trong ống', wFluid], ['Bảo ôn', wIns]
      ];
      if (wExtra) rows.push(['Tải phụ thêm', wExtra]);
      rows.push(['TỔNG', o.wTotal]);
      return rows.map(([n, w]) => [n, w, o.kgPerM(w)]);
    };
    return o;
  }

  /* Hệ số sơ đồ dầm: [hệ số moment cm, hệ số độ võng cd]
       M = w·L²/cm        δ = w·L⁴/(cd·E·I) */
  const SPAN_SCHEMES = {
    'Nhiều nhịp liên tục (thường dùng)': [10.0, 185.0],
    'Dầm đơn giản (2 gối, an toàn hơn)': [8.0, 76.8]
  };
  const DEFAULT_SPAN_SCHEME = 'Nhiều nhịp liên tục (thường dùng)';

  /* Cơ sở của ASME B31.1 Table 121.5 */
  const B31_1_SIGMA = 15.9;   // MPa (2300 psi)
  const B31_1_SAG = 2.5;      // mm  (0.1 in)

  function maxSpan(w, Z, I, E, sigmaAllow, sagAllow, scheme) {
    sigmaAllow = sigmaAllow || B31_1_SIGMA;
    sagAllow = sagAllow || B31_1_SAG;
    scheme = scheme || DEFAULT_SPAN_SCHEME;
    const [cm, cd] = SPAN_SCHEMES[scheme];
    if (w <= 0) throw new Error('Tải phân bố phải lớn hơn 0.');
    const Lsigma = Math.sqrt(cm * sigmaAllow * Z / w);
    const Ldelta = Math.pow(cd * E * I * sagAllow / w, 0.25);
    return {
      Lstress: Lsigma, Ldefl: Ldelta, scheme, sigmaAllow, sagAllow,
      get Lmax() { return Math.min(Lsigma, Ldelta); },
      get governedBy() { return Lsigma <= Ldelta ? 'ứng suất' : 'độ võng'; }
    };
  }

  function supportReaction(w, span, concentrated) {
    return w * span + (concentrated || 0);
  }

  /* Hệ số giãn nở nhiệt trung bình [1/°C] */
  const THERMAL_ALPHA = {
    'Thép carbon': 1.17e-5, 'Thép 9% Ni': 1.0e-5,
    'Inox austenit': 1.6e-5, 'Nhôm': 2.3e-5
  };

  function thermalMovement(lengthMm, dT, alpha) { return alpha * dT * lengthMm; }

  root.PSAT.pipe = {
    pipeLoad, maxSpan, supportReaction, thermalMovement,
    SPAN_SCHEMES, DEFAULT_SPAN_SCHEME, B31_1_SIGMA, B31_1_SAG, THERMAL_ALPHA
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
