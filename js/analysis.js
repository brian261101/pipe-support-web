/* Điều phối: dữ liệu nhập → mô hình PTHH → nội lực → kiểm tra → kết luận. */
(function (root) {
  'use strict';
  const fem = root.PSAT.fem;
  const chk = root.PSAT.checks;

  const SNAP_TOL = 1.0;   // mm

  function InputError(msg) {
    const e = new Error(msg);
    e.name = 'InputError';
    return e;
  }

  function memberLength(m) { return Math.hypot(m.x2 - m.x1, m.y2 - m.y1); }

  function loadComponents(ld) {
    const a = ld.angle * Math.PI / 180;
    return { fx: ld.magnitude * Math.cos(a), fy: ld.magnitude * Math.sin(a) };
  }

  function supportFlags(kind) {
    switch (kind) {
      case 'Ngàm':          return [true, true, true];
      case 'Khớp':          return [true, true, false];
      case 'Con lăn đứng':  return [false, true, false];
      case 'Con lăn ngang': return [true, false, false];
      default: throw InputError('Loại gối tựa không hợp lệ: ' + kind);
    }
  }

  function validate(p) {
    const notes = [];
    if (!p.members.length) throw InputError('Chưa khai báo thanh support nào.');
    if (!p.supports.length) throw InputError('Chưa khai báo gối tựa (điểm liên kết với kết cấu đỡ).');
    if (!p.loads.length) throw InputError('Chưa khai báo lực tác dụng.');

    p.members.forEach((m, i) => {
      if (memberLength(m) < 1)
        throw InputError('Thanh ' + (i + 1) + ' có chiều dài ' +
          memberLength(m).toFixed(3) + ' mm — kiểm tra lại toạ độ.');
    });

    p.loads.forEach((ld, j) => {
      let bestD = Infinity, bestI = -1;
      p.members.forEach((m, i) => {
        const [d] = fem.pointOnSegment(ld.x, ld.y, m.x1, m.y1, m.x2, m.y2);
        if (d < bestD) { bestD = d; bestI = i; }
      });
      if (bestD > SNAP_TOL) {
        throw InputError(
          'Điểm đặt lực ' + (j + 1) + ' tại (' + ld.x.toFixed(1) + ', ' +
          ld.y.toFixed(1) + ') KHÔNG nằm trên thanh nào.\n\n' +
          'Thanh gần nhất là thanh ' + (bestI + 1) + ', cách ' + bestD.toFixed(1) + ' mm.\n\n' +
          'Lực chỉ có thể truyền vào kết cấu qua một thanh. Hãy:\n' +
          '  • đổi toạ độ điểm đặt lực về nằm trên một thanh, hoặc\n' +
          '  • thêm một thanh chạy đến điểm đó (ví dụ thanh đỡ từ khung ra vị trí ống).');
      }
    });

    p.supports.forEach((s, k) => {
      let best = Infinity;
      for (const m of p.members) {
        best = Math.min(best, Math.hypot(s.x - m.x1, s.y - m.y1),
                              Math.hypot(s.x - m.x2, s.y - m.y2));
      }
      if (best > SNAP_TOL) {
        notes.push('Gối tựa ' + (k + 1) + ' tại (' + s.x.toFixed(0) + ', ' +
          s.y.toFixed(0) + ') không trùng đầu thanh nào (cách ' + best.toFixed(1) +
          ' mm) — sẽ được gán vào nút gần nhất trên lưới.');
      }
    });
    return notes;
  }

  function buildModel(p) {
    const m = new fem.Model();
    const forced = p.loads.map(l => [l.x, l.y]).concat(p.supports.map(s => [s.x, s.y]));

    const perMember = [];
    p.members.forEach((mi, i) => {
      let wy = 0;
      if (p.selfWeight) wy = -mi.section.A * 1e-6 * p.rhoSteel * 9.80665 / 1000;
      perMember.push(fem.meshMember(m, [mi.x1, mi.y1], [mi.x2, mi.y2],
        p.E, mi.section.A, mi.section.Ix, p.nseg, i, 0, wy, forced));
    });

    const nodeOfLoad = p.loads.map(ld => {
      const n = m.addNode(ld.x, ld.y);
      const c = loadComponents(ld);
      m.loads.push({ node: n, fx: c.fx, fy: c.fy, mz: 0 });
      return n;
    });

    for (const s of p.supports) {
      let bestI = 0, bestD = Infinity;
      for (const nd of m.nodes) {
        const d = Math.hypot(nd.x - s.x, nd.y - s.y);
        if (d < bestD) { bestI = nd.idx; bestD = d; }
      }
      const [ux, uy, rz] = supportFlags(s.kind);
      m.supports.push({ node: bestI, ux, uy, rz });
    }
    return { model: m, perMember, nodeOfLoad };
  }

  function run(p) {
    const notes = validate(p);
    const { model, perMember, nodeOfLoad } = buildModel(p);

    if (model.elements.length > 400) {
      throw InputError('Mô hình có ' + model.elements.length +
        ' phần tử — quá lớn. Giảm số đoạn chia mỗi thanh.');
    }

    const sol = fem.solve(model);

    const memberChecks = [];
    p.members.forEach((mi, i) => {
      const ids = perMember[i];
      if (!ids.length) return;
      let Nc = 0, Nt = 0, Mmax = 0, Vmax = 0, xCrit = 0;
      let xyCrit = [mi.x1, mi.y1];
      let offset = 0;
      const L = memberLength(mi);

      for (const eid of ids) {
        const r = sol.elements[eid];
        Nc = Math.min(Nc, r.N, r.N1);
        Nt = Math.max(Nt, r.N, r.N1);
        Vmax = Math.max(Vmax, r.Vmax);
        for (let k = 0; k < r.x.length; k++) {
          const mv = Math.abs(r.M[k]);
          if (mv > Mmax) {
            Mmax = mv;
            xCrit = offset + r.x[k];
            const t = L ? xCrit / L : 0;
            xyCrit = [mi.x1 + t * (mi.x2 - mi.x1), mi.y1 + t * (mi.y2 - mi.y1)];
          }
        }
        offset += r.L;
      }
      const N = Math.abs(Nc) >= Math.abs(Nt) ? Nc : Nt;

      memberChecks.push(chk.checkMember(i, mi.label || ('Thanh ' + (i + 1)),
        mi.section, p.Fy, p.E, N, Mmax, Vmax, L, p.Kfactor, xCrit, xyCrit, mi.expected));
    });

    let lambdas = [], modes = [], bnote = '';
    if (p.doBuckling) {
      const b = fem.buckling(model, sol, 2);
      lambdas = b.lambdas; modes = b.modes; bnote = b.note;
      if (bnote) notes.push(bnote);
    }
    const lamB = lambdas.length ? lambdas[0] : 0;

    const a = chk.assess(memberChecks, lamB, bnote,
                         sol.maxTranslation, sol.maxNode, p.dispLimit);

    return { model, solution: sol, assessment: a, bucklingModes: modes,
             lambdas, notes, nodeOfLoad };
  }

  /* Thử lần lượt các tiết diện, GIẢI LẠI TOÀN BỘ bài toán PTHH cho mỗi phương
     án (đổi độ cứng sẽ phân bố lại nội lực trong khung siêu tĩnh). */
  function autoSize(p, candidates, target) {
    target = target === undefined ? 1.0 : target;
    const ordered = candidates.slice().sort((a, b) => a.A - b.A);
    const out = [];
    for (const sp of ordered) {
      const trial = Object.assign({}, p, {
        members: p.members.map(m => Object.assign({}, m, { section: sp }))
      });
      try {
        const r = run(trial);
        out.push({ section: sp, result: r,
                   ok: r.assessment.lambdaAllow >= target && r.assessment.dispOk,
                   error: '' });
      } catch (exc) {
        out.push({ section: sp, result: null, ok: false, error: exc.message });
      }
    }
    return out;
  }

  root.PSAT.analysis = { run, autoSize, buildModel, memberLength,
                         loadComponents, supportFlags, InputError, SNAP_TOL };
})(typeof globalThis !== 'undefined' ? globalThis : this);
