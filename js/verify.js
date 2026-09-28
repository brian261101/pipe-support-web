/* Tự kiểm chứng solver PTHH bằng các bài toán có nghiệm giải tích.
   Chạy được cả trong trình duyệt (nút "Tự kiểm chứng") lẫn trong Node. */
(function (root) {
  'use strict';
  const fem = root.PSAT.fem;

  const E = 210000, A = 3000, I = 2e7, L = 3000;

  function runVerification() {
    const rows = [];
    function check(name, got, want, rtol, atol) {
      rtol = rtol === undefined ? 2e-3 : rtol;
      const tol = want !== 0 ? rtol * Math.abs(want)
                             : (atol === undefined ? 1e-6 : atol);
      rows.push({ name, got, want, ok: Math.abs(got - want) <= tol });
    }

    // công xôn + lực tập trung
    {
      const P = -5000;
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [L, 0], E, A, I, 8, 0);
      const tip = m.addNode(L, 0);
      m.supports.push({ node: m.addNode(0, 0), ux: true, uy: true, rz: true });
      m.loads.push({ node: tip, fy: P });
      const s = fem.solve(m);
      check('Công xôn + P: chuyển vị đầu tự do [mm]',
            s.nodeDisp(tip)[1], P * L ** 3 / (3 * E * I));
      check('Công xôn + P: moment ngàm [N·mm]',
            Math.max(...s.elements.map(r => r.Mmax)), Math.abs(P) * L);
    }

    // công xôn + tải phân bố đều
    {
      const w = -2;
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [L, 0], E, A, I, 10, 0, 0, w);
      const tip = m.addNode(L, 0);
      m.supports.push({ node: m.addNode(0, 0), ux: true, uy: true, rz: true });
      const s = fem.solve(m);
      check('Công xôn + UDL: chuyển vị đầu tự do [mm]',
            s.nodeDisp(tip)[1], w * L ** 4 / (8 * E * I));
      check('Công xôn + UDL: moment ngàm [N·mm]',
            Math.max(...s.elements.map(r => r.Mmax)), Math.abs(w) * L * L / 2);
    }

    // dầm đơn giản, lực giữa nhịp
    {
      const P = -8000;
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [L, 0], E, A, I, 8, 0, 0, 0, [[L / 2, 0]]);
      const n0 = m.addNode(0, 0), n1 = m.addNode(L, 0), nm = m.addNode(L / 2, 0);
      m.supports.push({ node: n0, ux: true, uy: true, rz: false });
      m.supports.push({ node: n1, ux: false, uy: true, rz: false });
      m.loads.push({ node: nm, fy: P });
      const s = fem.solve(m);
      check('Dầm đơn giản + P giữa nhịp: độ võng [mm]',
            s.nodeDisp(nm)[1], P * L ** 3 / (48 * E * I));
      check('Dầm đơn giản + P giữa nhịp: moment max [N·mm]',
            Math.max(...s.elements.map(r => r.Mmax)), Math.abs(P) * L / 4);
    }

    // thanh kéo dọc trục
    {
      const P = 40000;
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [0, L], E, A, I, 4, 0);
      const top = m.addNode(0, L);
      m.supports.push({ node: m.addNode(0, 0), ux: true, uy: true, rz: true });
      m.loads.push({ node: top, fy: P });
      const s = fem.solve(m);
      check('Thanh kéo dọc trục: giãn dài [mm]', s.nodeDisp(top)[1], P * L / (E * A));
      check('Thanh kéo dọc trục: lực dọc trục [N]', s.elements[0].N, P);
    }

    // Euler — ba điều kiện biên
    function euler(name, supTop, factor, rtol) {
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [0, L], E, A, I, 12, 0);
      const base = m.addNode(0, 0), top = m.addNode(0, L);
      m.supports.push(base === undefined ? null : supTop.base(base));
      if (supTop.top) m.supports.push(supTop.top(top));
      m.loads.push({ node: top, fy: -1000 });
      const s = fem.solve(m);
      const b = fem.buckling(m, s);
      check(name, (b.lambdas[0] || 0) * 1000,
            Math.PI ** 2 * E * I / (factor * L) ** 2, rtol || 5e-3);
    }
    euler('Euler: cột 2 đầu khớp — Pcr [N]', {
      base: n => ({ node: n, ux: true, uy: true, rz: false }),
      top: n => ({ node: n, ux: true, uy: false, rz: false })
    }, 1.0);
    euler('Euler: cột ngàm – tự do — Pcr [N]', {
      base: n => ({ node: n, ux: true, uy: true, rz: true }), top: null
    }, 2.0);
    euler('Euler: cột ngàm – khớp — Pcr [N]', {
      base: n => ({ node: n, ux: true, uy: true, rz: true }),
      top: n => ({ node: n, ux: true, uy: false, rz: false })
    }, 0.6992, 1e-2);

    // cân bằng khung
    {
      const m = new fem.Model();
      fem.meshMember(m, [0, 0], [0, 2000], E, A, I, 4, 0);
      fem.meshMember(m, [0, 2000], [2500, 2000], E, A, I, 6, 1, 0, -1.5);
      const base = m.addNode(0, 0), tip = m.addNode(2500, 2000);
      m.supports.push({ node: base, ux: true, uy: true, rz: true });
      m.loads.push({ node: tip, fy: -7000, fx: 1200 });
      const s = fem.solve(m);
      check('Cân bằng khung: tổng Fx [N]', s.reactions[3 * base] + 1200, 0, 0, 1e-6);
      check('Cân bằng khung: tổng Fy [N]',
            s.reactions[3 * base + 1] - 7000 - 1.5 * 2500, 0, 0, 1e-6);
    }

    return rows;
  }

  root.PSAT.verify = { runVerification };
})(typeof globalThis !== 'undefined' ? globalThis : this);
