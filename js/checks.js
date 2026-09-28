/* Kiểm tra khả năng chịu lực của thanh thép, từ kết quả PTHH.

   Phương pháp ứng suất cho phép (ASD) theo tinh thần AISC 360:
     kéo    Ft = 0,6·Fy          uốn   Fb = 0,6·Fy          cắt  Fv = 0,4·Fy
     nén    Fa = Fcr/1,67, Fcr theo AISC 360 chương E
     tổ hợp AISC H1-1

   Cách này THIÊN VỀ AN TOÀN so với AISC đầy đủ: không cộng dự trữ dẻo
   (dùng S chứ không phải Z), không cộng điểm cho ổn định ngang của dầm. */
(function (root) {
  'use strict';
  const rMinEffective = root.PSAT.sections.rMinEffective;

  const SF = 1.67;
  const SLENDER_LIMIT_C = 200;
  const SLENDER_LIMIT_T = 300;

  function compressiveStress(Fy, E, KLr) {
    if (KLr <= 1e-9) return { Fe: Infinity, Fcr: Fy, Fa: Fy / SF };
    const Fe = Math.PI ** 2 * E / (KLr * KLr);
    const Fcr = KLr <= 4.71 * Math.sqrt(E / Fy)
      ? Math.pow(0.658, Fy / Fe) * Fy
      : 0.877 * Fe;
    return { Fe, Fcr, Fa: Fcr / SF };
  }

  function checkMember(member, name, sp, Fy, E, N, M, V, L, K, xCrit, xyCrit, expected) {
    const warnings = [];
    const r = rMinEffective(sp);
    const KLr = r > 0 ? K * L / r : 0;

    const fa = Math.abs(N) / sp.A;
    const fb = sp.Sx > 0 ? Math.abs(M) / sp.Sx : 0;
    const fv = sp.Av > 0 ? Math.abs(V) / sp.Av : 0;
    const Fb = 0.6 * Fy, Fv = 0.4 * Fy;

    let Fa, Fe = NaN, Fcr = NaN;
    if (N >= 0) {
      Fa = 0.6 * Fy;
      if (KLr > SLENDER_LIMIT_T) {
        warnings.push('Độ mảnh KL/r = ' + KLr.toFixed(0) +
          ' vượt khuyến nghị ' + SLENDER_LIMIT_T + ' cho thanh kéo.');
      }
    } else {
      const c = compressiveStress(Fy, E, KLr);
      Fa = c.Fa; Fe = c.Fe; Fcr = c.Fcr;
      if (KLr > SLENDER_LIMIT_C) {
        warnings.push('Độ mảnh KL/r = ' + KLr.toFixed(0) + ' VƯỢT giới hạn ' +
          SLENDER_LIMIT_C + ' cho thanh nén — phải giằng bớt hoặc tăng tiết diện.');
      } else if (KLr > 120) {
        warnings.push('Thanh mảnh (KL/r = ' + KLr.toFixed(0) +
          ') — khả năng chịu nén giảm nhiều.');
      }
    }

    const uAxial = Fa > 0 ? fa / Fa : Infinity;
    const uBend = Fb > 0 ? fb / Fb : 0;
    const uShear = Fv > 0 ? fv / Fv : 0;
    const uComb = uAxial >= 0.2 ? uAxial + (8 / 9) * uBend : uAxial / 2 + uBend;

    if (expected === 'Kéo' && N < -1e-6) {
      warnings.push('Bạn khai báo thanh này CHỊU KÉO nhưng PTHH cho ra CHỊU NÉN (' +
        N.toFixed(0) + ' N). Nếu thanh chỉ là thanh giằng hoặc cáp thì phải bố trí lại.');
    }
    if (expected === 'Nén' && N > 1e-6) {
      warnings.push('Bạn khai báo thanh này CHỊU NÉN nhưng PTHH cho ra CHỊU KÉO (' +
        N.toFixed(0) + ' N).');
    }
    if (sp.shape === 'angle' && Math.abs(N) > 1e-6) {
      warnings.push('Thép góc chịu lực dọc trục thường lệch tâm — khả năng thực tế ' +
        'thấp hơn kết quả ở đây. Xem AISC 360 mục E5.');
    }
    if (sp.shape === 'channel' && Math.abs(M) > 1e-6) {
      warnings.push('Thép U có tâm cắt lệch khỏi trọng tâm — nếu tải không đi qua ' +
        'tâm cắt sẽ sinh xoắn, chưa tính ở đây.');
    }

    return {
      member, name, L, N, M, V, xCrit, xyCrit,
      fa, fb, fv, Fa, Fb, Fv, slenderness: KLr, Fe, Fcr,
      uAxial, uBend, uShear, uCombined: uComb, warnings,
      get utilization() { return Math.max(uAxial, uBend, uShear, uComb); },
      get action() { return N > 1e-6 ? 'KÉO' : (N < -1e-6 ? 'NÉN' : '—'); },
      get ok() { return this.utilization <= 1; },
      get dominant() {
        const a = Fa > 0 ? fa / Fa : 0, b = Fb > 0 ? fb / Fb : 0;
        if (b > 2 * a) return 'uốn';
        if (a > 2 * b) return 'dọc trục';
        return 'uốn + dọc trục';
      }
    };
  }

  function assess(checks, lambdaBuckling, bucklingNote, maxDisp, maxDispNode, dispLimit) {
    let gov = null;
    for (const c of checks) if (!gov || c.utilization > gov.utilization) gov = c;
    const umax = gov ? gov.utilization : 0;
    const lamS = umax > 1e-12 ? 1 / umax : Infinity;

    return {
      members: checks, lambdaStrength: lamS, lambdaBuckling, bucklingNote,
      maxDisp, maxDispNode, dispLimit, governing: gov,
      get lambdaAllow() {
        const v = [lamS];
        if (lambdaBuckling > 0) v.push(lambdaBuckling / SF);
        return Math.min.apply(null, v);
      },
      get governedBy() {
        if (lambdaBuckling > 0 && lambdaBuckling / SF < lamS)
          return 'ổn định tổng thể (mất ổn định)';
        if (!gov) return '—';
        return 'bền — ' + gov.name + ' (' + gov.dominant + ')';
      },
      get dispOk() { return dispLimit <= 0 || maxDisp <= dispLimit; }
    };
  }

  root.PSAT.checks = { SF, checkMember, assess, compressiveStress };
})(typeof globalThis !== 'undefined' ? globalThis : this);
