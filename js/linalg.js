/* Đại số tuyến tính thuần JavaScript — không phụ thuộc thư viện nào.
   Ma trận = mảng các mảng (hàng), vector = mảng số.
   Đủ cho bài toán PTHH khung phẳng vài trăm bậc tự do. */
(function (root) {
  'use strict';

  function SingularMatrix(msg) {
    const e = new Error(msg);
    e.name = 'SingularMatrix';
    return e;
  }

  function zeros(n, m) {
    if (m === undefined) return new Float64Array(n);
    const A = new Array(n);
    for (let i = 0; i < n; i++) A[i] = new Float64Array(m);
    return A;
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function norm(a) { return Math.sqrt(dot(a, a)); }

  function scale(a, k) {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * k;
    return out;
  }

  function matvec(A, x) {
    const n = A.length;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const Ai = A[i];
      let s = 0;
      for (let j = 0; j < x.length; j++) {
        const v = Ai[j];
        if (v !== 0) s += v * x[j];
      }
      out[i] = s;
    }
    return out;
  }

  function submatrix(A, idx) {
    const n = idx.length;
    const B = zeros(n, n);
    for (let i = 0; i < n; i++) {
      const Ai = A[idx[i]], Bi = B[i];
      for (let j = 0; j < n; j++) Bi[j] = Ai[idx[j]];
    }
    return B;
  }

  function subvector(v, idx) {
    const out = new Float64Array(idx.length);
    for (let i = 0; i < idx.length; i++) out[i] = v[idx[i]];
    return out;
  }

  /* ---------------- Cholesky  A = L Lᵀ ---------------- */
  function cholesky(A) {
    const n = A.length;
    const L = zeros(n, n);
    for (let i = 0; i < n; i++) {
      const Li = L[i], Ai = A[i];
      for (let j = 0; j <= i; j++) {
        const Lj = L[j];
        let s = 0;
        for (let k = 0; k < j; k++) s += Li[k] * Lj[k];
        if (i === j) {
          const d = Ai[i] - s;
          if (d <= 1e-12 * Math.max(1, Math.abs(Ai[i]))) {
            throw SingularMatrix(
              'Ma trận độ cứng không xác định dương tại bậc tự do ' + i +
              '. Kết cấu thiếu liên kết hoặc có thanh bị tách rời.');
          }
          Li[j] = Math.sqrt(d);
        } else {
          Li[j] = (Ai[j] - s) / Lj[j];
        }
      }
    }
    return L;
  }

  function forwardSub(L, b) {
    const n = L.length;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const Li = L[i];
      let s = b[i];
      for (let k = 0; k < i; k++) s -= Li[k] * y[k];
      y[i] = s / Li[i];
    }
    return y;
  }

  function backSubT(L, y) {
    const n = L.length;
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }

  function cholSolve(L, b) { return backSubT(L, forwardSub(L, b)); }

  /* ---------------- trị riêng: K φ = λ (−Kg) φ ----------------
     Đổi biến ψ = Lᵀφ  →  M ψ = (1/λ) ψ  với  M = L⁻¹ G L⁻ᵀ (đối xứng).
     M không bao giờ được dựng hiện; mỗi bước lặp chỉ cần một phép thế
     thuận và một phép thế ngược.                                      */
  function orthogonalize(v, basis) {
    for (const u of basis) {
      const c = dot(v, u);
      for (let i = 0; i < v.length; i++) v[i] -= c * u[i];
    }
    return v;
  }

  function smallestPositiveEigen(L, G, nmodes, iters, tol) {
    nmodes = nmodes || 3;
    iters = iters || 300;
    tol = tol || 1e-9;
    const n = L.length;

    function Mapply(psi) {
      return forwardSub(L, matvec(G, backSubT(L, psi)));
    }
    function rayleigh(v) { return dot(v, Mapply(v)); }

    function power(shift, basis) {
      let v = new Float64Array(n);
      for (let i = 0; i < n; i++) v[i] = Math.sin(3 * i + 1);
      orthogonalize(v, basis);
      let nv = norm(v);
      if (nv < 1e-300) return null;
      v = scale(v, 1 / nv);

      let mu = 0;
      for (let it = 0; it < iters; it++) {
        const w = Mapply(v);
        if (shift) for (let i = 0; i < n; i++) w[i] += shift * v[i];
        orthogonalize(w, basis);
        const nw = norm(w);
        if (nw < 1e-300) return null;
        const wn = scale(w, 1 / nw);
        const muNew = rayleigh(wn);
        if (it > 5 && Math.abs(muNew - mu) <= tol * Math.max(1, Math.abs(muNew))) {
          return { mu: muNew, v: wn };
        }
        v = wn; mu = muNew;
      }
      return { mu: mu, v: v };
    }

    // Với bài toán ổn định thông thường (các thanh chịu nén) phổ của M
    // không âm nên KHÔNG cần dịch — lặp lũy thừa trần hội tụ rất nhanh
    // theo tỉ số λ₁/λ₂. Chỉ khi trị riêng trội lại âm mới cần dịch, và
    // khi đó dịch đúng bằng độ lớn của nó; dịch lớn hơn làm chậm hội tụ.
    const first = power(0, []);
    if (!first) return { lambdas: [], modes: [] };
    const baseShift = first.mu > 0 ? 0 : Math.abs(first.mu) * 1.02;

    const lams = [], modes = [], found = [];
    for (let k = 0; k < nmodes; k++) {
      const r = power(baseShift, found);
      if (!r || r.mu <= 1e-14) break;
      const lam = 1 / r.mu;
      let phi = backSubT(L, r.v);
      let mx = 0;
      for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(phi[i]));
      if (mx > 0) phi = scale(phi, 1 / mx);
      lams.push(lam);
      modes.push(phi);
      found.push(Float64Array.from(r.v));
    }

    const order = lams.map((v, i) => i).sort((a, b) => lams[a] - lams[b]);
    return {
      lambdas: order.map(i => lams[i]),
      modes: order.map(i => modes[i])
    };
  }

  root.PSAT = root.PSAT || {};
  root.PSAT.linalg = {
    zeros, dot, norm, scale, matvec, submatrix, subvector,
    cholesky, forwardSub, backSubT, cholSolve, smallestPositiveEigen
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
