/* Phần tử hữu hạn — khung phẳng (2D frame).

   Phần tử dầm–cột Euler–Bernoulli, 6 bậc tự do (u, v, θ ở mỗi nút).
   Phân tích: tĩnh học tuyến tính K u = F, và ổn định đàn hồi
   (K + λ·Kg) φ = 0 → hệ số tải tới hạn.

   Đơn vị nội bộ: mm, N, MPa. Trục x sang phải, y lên trên,
   moment ngược chiều kim đồng hồ là dương.

   Quy ước nội lực mỗi phần tử (hệ toạ độ địa phương):
     f = [N1, V1, M1, N2, V2, M2] — lực tác dụng LÊN phần tử tại hai đầu.
     Lực dọc trục quy ước KÉO dương: N = f[3]. */
(function (root) {
  'use strict';
  const la = root.PSAT.linalg;
  const TOL = 1e-6;

  class Model {
    constructor() {
      this.nodes = [];       // {x, y, idx}
      this.elements = [];    // {n1,n2,E,A,I,wx,wy,member,L,c,s}
      this.supports = [];    // {node, ux, uy, rz}
      this.loads = [];       // {node, fx, fy, mz}
    }
    addNode(x, y) {
      for (const n of this.nodes) {
        if (Math.abs(n.x - x) <= TOL && Math.abs(n.y - y) <= TOL) return n.idx;
      }
      const n = { x: x, y: y, idx: this.nodes.length };
      this.nodes.push(n);
      return n.idx;
    }
    get ndof() { return 3 * this.nodes.length; }
  }

  function geometry(m, e) {
    const n1 = m.nodes[e.n1], n2 = m.nodes[e.n2];
    const dx = n2.x - n1.x, dy = n2.y - n1.y;
    e.L = Math.hypot(dx, dy);
    if (e.L <= TOL) throw new Error('Phần tử có chiều dài bằng 0 (hai nút trùng nhau).');
    e.c = dx / e.L;
    e.s = dy / e.L;
  }

  function kLocal(e) {
    const E = e.E, A = e.A, I = e.I, L = e.L;
    const ea = E * A / L;
    const a = 12 * E * I / (L * L * L);
    const b = 6 * E * I / (L * L);
    const c4 = 4 * E * I / L;
    const c2 = 2 * E * I / L;
    return [
      [ea, 0, 0, -ea, 0, 0],
      [0, a, b, 0, -a, b],
      [0, b, c4, 0, -b, c2],
      [-ea, 0, 0, ea, 0, 0],
      [0, -a, -b, 0, a, -b],
      [0, b, c2, 0, -b, c4]
    ];
  }

  function kgLocal(L, N) {
    const f = N / L, L2 = L * L;
    return [
      [0, 0, 0, 0, 0, 0],
      [0, f * 1.2, f * L / 10, 0, -f * 1.2, f * L / 10],
      [0, f * L / 10, f * 2 * L2 / 15, 0, -f * L / 10, -f * L2 / 30],
      [0, 0, 0, 0, 0, 0],
      [0, -f * 1.2, -f * L / 10, 0, f * 1.2, -f * L / 10],
      [0, f * L / 10, -f * L2 / 30, 0, -f * L / 10, f * 2 * L2 / 15]
    ];
  }

  function toGlobal(e, kl) {
    const c = e.c, s = e.s;
    const T = [
      [c, s, 0, 0, 0, 0],
      [-s, c, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0],
      [0, 0, 0, -s, c, 0],
      [0, 0, 0, 0, 0, 1]
    ];
    const tmp = [];
    for (let i = 0; i < 6; i++) {
      const row = new Float64Array(6);
      for (let j = 0; j < 6; j++) {
        let v = 0;
        for (let k = 0; k < 6; k++) v += kl[i][k] * T[k][j];
        row[j] = v;
      }
      tmp.push(row);
    }
    const out = [];
    for (let i = 0; i < 6; i++) {
      const row = new Float64Array(6);
      for (let j = 0; j < 6; j++) {
        let v = 0;
        for (let k = 0; k < 6; k++) v += T[k][i] * tmp[k][j];
        row[j] = v;
      }
      out.push(row);
    }
    return out;
  }

  function localFromGlobal(e, u) {
    const c = e.c, s = e.s;
    return [c * u[0] + s * u[1], -s * u[0] + c * u[1], u[2],
            c * u[3] + s * u[4], -s * u[3] + c * u[4], u[5]];
  }

  function globalFromLocal(e, f) {
    const c = e.c, s = e.s;
    return [c * f[0] - s * f[1], s * f[0] + c * f[1], f[2],
            c * f[3] - s * f[4], s * f[3] + c * f[4], f[5]];
  }

  function fefLocal(e) {
    const p = e.wx * e.c + e.wy * e.s;
    const q = -e.wx * e.s + e.wy * e.c;
    const L = e.L;
    return [-p * L / 2, -q * L / 2, -q * L * L / 12,
            -p * L / 2, -q * L / 2, q * L * L / 12];
  }

  function dofs(e) {
    return [3 * e.n1, 3 * e.n1 + 1, 3 * e.n1 + 2,
            3 * e.n2, 3 * e.n2 + 1, 3 * e.n2 + 2];
  }

  function assemble(m) {
    for (const e of m.elements) geometry(m, e);
    const n = m.ndof;
    const K = la.zeros(n, n);
    const F = new Float64Array(n);

    for (const e of m.elements) {
      const kg = toGlobal(e, kLocal(e));
      const d = dofs(e);
      for (let a = 0; a < 6; a++) {
        const Ka = K[d[a]], kga = kg[a];
        for (let b = 0; b < 6; b++) Ka[d[b]] += kga[b];
      }
      if (e.wx || e.wy) {
        const fef = fefLocal(e);
        const eq = globalFromLocal(e, fef.map(v => -v));
        for (let a = 0; a < 6; a++) F[d[a]] += eq[a];
      }
    }
    for (const ld of m.loads) {
      F[3 * ld.node] += ld.fx || 0;
      F[3 * ld.node + 1] += ld.fy || 0;
      F[3 * ld.node + 2] += ld.mz || 0;
    }
    return { K: K, F: F };
  }

  function freeDofs(m) {
    const fixed = new Array(m.ndof).fill(false);
    for (const s of m.supports) {
      if (s.ux) fixed[3 * s.node] = true;
      if (s.uy) fixed[3 * s.node + 1] = true;
      if (s.rz) fixed[3 * s.node + 2] = true;
    }
    const out = [];
    for (let i = 0; i < m.ndof; i++) if (!fixed[i]) out.push(i);
    return out;
  }

  function solve(m, nstation) {
    nstation = nstation || 21;
    const { K, F } = assemble(m);
    const free = freeDofs(m);

    if (!free.length) throw new Error('Mọi bậc tự do đều bị khoá — không có gì để giải.');
    if (free.length === m.ndof) {
      throw new Error('Chưa khai báo gối tựa nào.\n' +
        'Phải có ít nhất một nút được liên kết với kết cấu đỡ.');
    }

    const Kff = la.submatrix(K, free);
    const Ff = la.subvector(F, free);
    let Lc;
    try {
      Lc = la.cholesky(Kff);
    } catch (exc) {
      throw new Error(
        'Kết cấu không ổn định (thiếu liên kết).\n\n' + exc.message + '\n\n' +
        'Thường gặp khi: chỉ có một gối khớp mà không có thanh giằng, hai thanh ' +
        'không thực sự nối với nhau tại toạ độ trùng nhau, hoặc một thanh bị ' +
        'tách rời khỏi phần còn lại.');
    }

    const uf = la.cholSolve(Lc, Ff);
    const u = new Float64Array(m.ndof);
    free.forEach((dof, k) => { u[dof] = uf[k]; });

    const Ku = la.matvec(K, u);
    const reactions = new Float64Array(m.ndof);
    for (let i = 0; i < m.ndof; i++) reactions[i] = Ku[i] - F[i];

    const results = [];
    m.elements.forEach((e, k) => {
      const d = dofs(e);
      const ug = d.map(i => u[i]);
      const ul = localFromGlobal(e, ug);
      const kl = kLocal(e);
      const fef = fefLocal(e);
      const f = [];
      for (let i = 0; i < 6; i++) {
        let v = fef[i];
        for (let j = 0; j < 6; j++) v += kl[i][j] * ul[j];
        f.push(v);
      }
      // Với tải phân bố dọc trục, N biến thiên tuyến tính dọc phần tử
      // → phải giữ cả hai đầu, nếu không sẽ bỏ sót giá trị lớn nhất.
      const N = f[3], N1 = -f[0];
      const q = -e.wx * e.s + e.wy * e.c;
      const xs = [], M = [], V = [];
      for (let i = 0; i < nstation; i++) {
        const x = e.L * i / (nstation - 1);
        xs.push(x);
        // Cân bằng đoạn [0,x] tính từ đầu 1:
        //   ΣFy: f1 + q·x + V(x) = 0        → V(x) = −f1 − q·x
        //   ΣM : f2 − f1·x − q·x²/2 + M(x)=0 → M(x) = −f2 + f1·x + q·x²/2
        V.push(-f[1] - q * x);
        M.push(-f[2] + f[1] * x + q * x * x / 2);
      }
      results.push({
        element: k, member: e.member, L: e.L, fLocal: f, N: N, N1: N1,
        x: xs, M: M, V: V,
        get Mmax() { return Math.max(...this.M.map(Math.abs)); },
        get Vmax() { return Math.max(...this.V.map(Math.abs)); }
      });
    });

    let best = 0, at = 0;
    for (let i = 0; i < m.nodes.length; i++) {
      const dd = Math.hypot(u[3 * i], u[3 * i + 1]);
      if (dd > best) { best = dd; at = i; }
    }

    return {
      u: u, reactions: reactions, elements: results, free: free, Lchol: Lc,
      maxTranslation: best, maxNode: at,
      nodeDisp: function (i) { return [u[3 * i], u[3 * i + 1], u[3 * i + 2]]; }
    };
  }

  const MAX_DOF_BUCKLING = 400;

  function buckling(m, sol, nmodes) {
    nmodes = nmodes || 2;
    const free = sol.free;
    if (free.length > MAX_DOF_BUCKLING) {
      return { lambdas: [], modes: [], note:
        'Bỏ qua phân tích ổn định: mô hình có ' + free.length +
        ' bậc tự do (giới hạn ' + MAX_DOF_BUCKLING + '). Giảm số đoạn chia mỗi thanh.' };
    }

    const n = m.ndof;
    const Kg = la.zeros(n, n);
    let anyCompression = false;
    m.elements.forEach((e, i) => {
      const r = sol.elements[i];
      if (r.N < 0) anyCompression = true;
      const kg = toGlobal(e, kgLocal(e.L, r.N));
      const d = dofs(e);
      for (let a = 0; a < 6; a++) {
        const row = Kg[d[a]], kga = kg[a];
        for (let b = 0; b < 6; b++) row[d[b]] += kga[b];
      }
    });

    if (!anyCompression) {
      return { lambdas: [], modes: [], note:
        'Không có thanh nào chịu nén — kết cấu không thể mất ổn định dưới tổ hợp tải này.' };
    }

    const G = [];
    for (let i = 0; i < free.length; i++) {
      const row = new Float64Array(free.length);
      const Ki = Kg[free[i]];
      for (let j = 0; j < free.length; j++) row[j] = -Ki[free[j]];
      G.push(row);
    }

    const res = la.smallestPositiveEigen(sol.Lchol, G, nmodes);
    const shapes = res.modes.map(mf => {
      const phi = new Float64Array(n);
      free.forEach((dof, k) => { phi[dof] = mf[k]; });
      return phi;
    });
    return { lambdas: res.lambdas, modes: shapes, note: '' };
  }

  function meshMember(m, p1, p2, E, A, I, nseg, member, wx, wy, forced) {
    wx = wx || 0; wy = wy || 0;
    const [x1, y1] = p1, [x2, y2] = p2;
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L <= TOL) throw new Error('Thanh ' + (member + 1) + ' có chiều dài bằng 0.');

    nseg = Math.max(1, Math.round(nseg));
    const ts = new Set([0, 1]);
    for (let i = 1; i < nseg; i++) ts.add(i / nseg);

    for (const [fx, fy] of (forced || [])) {
      const t = ((fx - x1) * (x2 - x1) + (fy - y1) * (y2 - y1)) / (L * L);
      if (t >= -1e-9 && t <= 1 + 1e-9) {
        const px = x1 + t * (x2 - x1), py = y1 + t * (y2 - y1);
        if (Math.hypot(fx - px, fy - py) <= 1e-3) ts.add(Math.min(1, Math.max(0, t)));
      }
    }

    const tl = Array.from(ts).sort((a, b) => a - b);
    const made = [];
    for (let i = 0; i < tl.length - 1; i++) {
      const ta = tl[i], tb = tl[i + 1];
      if (tb - ta < 1e-9) continue;
      const na = m.addNode(x1 + ta * (x2 - x1), y1 + ta * (y2 - y1));
      const nb = m.addNode(x1 + tb * (x2 - x1), y1 + tb * (y2 - y1));
      m.elements.push({ n1: na, n2: nb, E: E, A: A, I: I, wx: wx, wy: wy,
                        member: member, L: 0, c: 1, s: 0 });
      made.push(m.elements.length - 1);
    }
    return made;
  }

  function pointOnSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const L2 = dx * dx + dy * dy;
    if (L2 <= TOL) return [Math.hypot(px - x1, py - y1), 0];
    const t = ((px - x1) * dx + (py - y1) * dy) / L2;
    const tc = Math.min(1, Math.max(0, t));
    return [Math.hypot(px - (x1 + tc * dx), py - (y1 + tc * dy)), tc];
  }

  root.PSAT.fem = { Model, assemble, solve, buckling, meshMember, pointOnSegment, TOL };
})(typeof globalThis !== 'undefined' ? globalThis : this);
