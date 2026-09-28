/* Vẽ sơ đồ khung trên <canvas> — tự vẽ, không dùng thư viện nào. */
(function (root) {
  'use strict';
  const memberLength = root.PSAT.analysis.memberLength;

  const C = {
    bg: '#0a0f1c', grid: 'rgba(120,160,220,0.07)', axis: 'rgba(120,160,220,0.20)',
    member: '#4fb3d9', ok: '#34d399', warn: '#f5a524', bad: '#e5544b',
    node: '#c9d6e2', support: '#9aa7b5', load: '#ff8c42',
    defl: '#7b61ff', moment: '#e5544b', mode: '#2ec4b6',
    text: '#c9d6e2', dim: '#6b7c8f'
  };

  class FrameView {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.sx = this.sy = 1; this.ox = this.oy = 0;
      this.showDeflection = true;
      this.showMoment = false;
      this.showMode = false;
      this.modeIndex = 0;
      this.data = null;
      this.w = 0; this.h = 0;
      // Bố cục có thể đổi sau khi script chạy (font tải xong, pane đổi cỡ),
      // nên theo dõi trực tiếp kích thước canvas thay vì chỉ bắt window.resize.
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this.resize());
        this._ro.observe(canvas);
      }
    }

    setData(project, result) { this.data = { project, result }; this.redraw(); }

    resize() {
      const r = this.cv.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      // một số trình duyệt/khung nhúng báo dpr < 1 làm ảnh bị mờ
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      this.cv.width = Math.max(1, Math.round(r.width * dpr));
      this.cv.height = Math.max(1, Math.round(r.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width; this.h = r.height;
      this.redraw();
    }

    fit(xs, ys, pad) {
      pad = pad || 62;
      const w = this.w || 600, h = this.h || 400;
      if (!xs.length) { this.sx = this.sy = 1; this.ox = w / 2; this.oy = h / 2; return; }
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const dx = Math.max(x1 - x0, 1), dy = Math.max(y1 - y0, 1);
      const s = Math.max(Math.min((w - 2 * pad) / dx, (h - 2 * pad) / dy), 1e-9);
      this.sx = this.sy = s;
      this.ox = (w - s * (x0 + x1)) / 2;
      this.oy = (h + s * (y0 + y1)) / 2;
    }

    W(x, y) { return [this.ox + this.sx * x, this.oy - this.sy * y]; }

    line(a, b, color, width, dash) {
      const g = this.ctx;
      g.save();
      g.strokeStyle = color; g.lineWidth = width || 1;
      g.setLineDash(dash || []);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.restore();
    }

    text(x, y, s, color, align, size) {
      const g = this.ctx;
      g.save();
      g.fillStyle = color;
      g.font = (size || 11) + 'px ui-monospace, Consolas, monospace';
      g.textAlign = align || 'left';
      g.fillText(s, x, y);
      g.restore();
    }

    redraw() {
      const g = this.ctx;
      if (!g) return;
      g.fillStyle = C.bg;
      g.fillRect(0, 0, this.w || 0, this.h || 0);
      if (!this.data || !this.data.project || !this.data.project.members.length) {
        this.text((this.w || 200) / 2, (this.h || 100) / 2,
          'Nhập thanh support rồi bấm Tính', C.dim, 'center', 12);
        return;
      }
      const { project, result } = this.data;
      const xs = project.members.flatMap(m => [m.x1, m.x2]);
      const ys = project.members.flatMap(m => [m.y1, m.y2]);
      this.fit(xs, ys);
      this.grid(xs, ys);
      this.members(project, result);
      if (result) {
        if (this.showMoment) this.moment(result);
        if (this.showMode && result.bucklingModes.length) this.mode(result);
        if (this.showDeflection) this.deflected(result);
      }
      this.supports(project);
      this.loads(project);
      if (result) this.legend(result);
    }

    grid(xs, ys) {
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const span = Math.max(x1 - x0, y1 - y0, 1);
      let step = Math.pow(10, Math.floor(Math.log10(span)));
      if (span / step < 3) step /= 2; else if (span / step > 8) step *= 2;

      const gx0 = Math.floor((x0 - step) / step) * step;
      const gx1 = Math.ceil((x1 + step) / step) * step;
      const gy0 = Math.floor((y0 - step) / step) * step;
      const gy1 = Math.ceil((y1 + step) / step) * step;

      let n = 0;
      for (let v = gx0; v <= gx1 + 1e-9 && n < 400; v += step, n++) {
        this.line(this.W(v, gy0), this.W(v, gy1),
          Math.abs(v) < 1e-9 ? C.axis : C.grid, 1);
      }
      n = 0;
      for (let v = gy0; v <= gy1 + 1e-9 && n < 400; v += step, n++) {
        this.line(this.W(gx0, v), this.W(gx1, v),
          Math.abs(v) < 1e-9 ? C.axis : C.grid, 1);
      }
      const p = this.W(gx0, gy0);
      this.text(p[0] + 4, p[1] - 8, 'ô lưới = ' + step + ' mm', C.dim, 'left', 10);
    }

    memberStyle(result, i) {
      if (!result) return [C.member, 4];
      for (const c of result.assessment.members) {
        if (c.member === i) {
          const u = c.utilization;
          if (u > 1) return [C.bad, 6];
          if (u > 0.85) return [C.warn, 5];
          return [C.ok, 4];
        }
      }
      return [C.member, 4];
    }

    members(project, result) {
      const g = this.ctx;
      project.members.forEach((m, i) => {
        const [col, wd] = this.memberStyle(result, i);
        const a = this.W(m.x1, m.y1), b = this.W(m.x2, m.y2);
        this.line(a, b, col, wd);
        let lab = m.label || ('T' + (i + 1));
        if (result) {
          for (const c of result.assessment.members) {
            if (c.member === i) { lab += '  ' + (c.utilization * 100).toFixed(0) + '%'; break; }
          }
        }
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        this.text((a[0] + b[0]) / 2 + nx * 15, (a[1] + b[1]) / 2 + ny * 15,
          lab, C.text, 'center', 11);
      });
      g.fillStyle = C.node;
      for (const m of project.members) {
        for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) {
          const p = this.W(x, y);
          g.beginPath(); g.arc(p[0], p[1], 3.5, 0, Math.PI * 2); g.fill();
        }
      }
    }

    supports(project) {
      const g = this.ctx;
      for (const s of project.supports) {
        const [x, y] = this.W(s.x, s.y);
        g.save();
        g.strokeStyle = C.support; g.lineWidth = 2;
        if (s.kind === 'Ngàm') {
          g.strokeRect(x - 14, y - 3, 28, 6);
          for (let k = -12; k <= 12; k += 6) this.line([x + k, y + 3], [x + k - 5, y + 12], C.support, 1);
        } else if (s.kind === 'Khớp') {
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 17);
          g.lineTo(x + 10, y + 17); g.closePath(); g.stroke();
          for (let k = -10; k <= 11; k += 6) this.line([x + k, y + 17], [x + k - 5, y + 25], C.support, 1);
        } else {
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 13);
          g.lineTo(x + 10, y + 13); g.closePath(); g.stroke();
          g.beginPath(); g.arc(x - 7, y + 16, 3.2, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.arc(x + 7, y + 16, 3.2, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
        this.text(x, y + 34, s.kind, C.dim, 'center', 9);
      }
    }

    loads(project) {
      if (!project.loads.length) return;
      const g = this.ctx;
      const mx = Math.max(...project.loads.map(l => l.magnitude)) || 1;
      for (const ld of project.loads) {
        const [x, y] = this.W(ld.x, ld.y);
        const L = 32 + 32 * (ld.magnitude / mx);
        const a = ld.angle * Math.PI / 180;
        const x0 = x - L * Math.cos(a), y0 = y + L * Math.sin(a);
        this.line([x0, y0], [x, y], C.load, 3);
        // đầu mũi tên
        const ang = Math.atan2(y - y0, x - x0);
        g.save(); g.fillStyle = C.load;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 13 * Math.cos(ang - 0.35), y - 13 * Math.sin(ang - 0.35));
        g.lineTo(x - 13 * Math.cos(ang + 0.35), y - 13 * Math.sin(ang + 0.35));
        g.closePath(); g.fill(); g.restore();
        this.text(x0, y0 - 9, (ld.label ? ld.label + ' ' : '') +
          (ld.magnitude / 1000).toFixed(2) + ' kN', C.load, 'center', 11);
      }
    }

    deflected(result) {
      const sol = result.solution, model = result.model;
      let dmax = 0;
      for (let i = 0; i < model.nodes.length; i++) {
        dmax = Math.max(dmax, Math.hypot(sol.u[3 * i], sol.u[3 * i + 1]));
      }
      if (dmax <= 1e-12) return;
      const k = (0.08 * (this.w || 400)) / (dmax * this.sx);
      for (const e of model.elements) {
        const n1 = model.nodes[e.n1], n2 = model.nodes[e.n2];
        const a = this.W(n1.x + k * sol.u[3 * e.n1], n1.y + k * sol.u[3 * e.n1 + 1]);
        const b = this.W(n2.x + k * sol.u[3 * e.n2], n2.y + k * sol.u[3 * e.n2 + 1]);
        this.line(a, b, C.defl, 2, [5, 4]);
      }
      this.text(10, 16, '- - -  biến dạng (×' + k.toFixed(0) + '), lớn nhất ' +
        dmax.toFixed(1) + ' mm', C.defl, 'left', 11);
    }

    moment(result) {
      const model = result.model;
      let mmax = 0;
      for (const r of result.solution.elements) mmax = Math.max(mmax, r.Mmax);
      if (mmax <= 1e-9) return;
      const k = (0.13 * (this.h || 400)) / mmax;
      const g = this.ctx;
      g.save(); g.strokeStyle = C.moment; g.lineWidth = 1;
      model.elements.forEach((e, i) => {
        const r = result.solution.elements[i];
        const n1 = model.nodes[e.n1], n2 = model.nodes[e.n2];
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        g.beginPath();
        r.x.forEach((xx, j) => {
          const off = r.M[j] * k / this.sx;
          const p = this.W(n1.x + ux * xx + nx * off, n1.y + uy * xx + ny * off);
          if (j === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]);
        });
        g.stroke();
        const p0 = this.W(n1.x, n1.y);
        const q0 = this.W(n1.x + nx * r.M[0] * k / this.sx,
                          n1.y + ny * r.M[0] * k / this.sx);
        this.line(p0, q0, C.moment, 1);
        const last = r.x.length - 1;
        const p1 = this.W(n2.x, n2.y);
        const q1 = this.W(n1.x + ux * r.x[last] + nx * r.M[last] * k / this.sx,
                          n1.y + uy * r.x[last] + ny * r.M[last] * k / this.sx);
        this.line(p1, q1, C.moment, 1);
      });
      g.restore();
      this.text(10, 32, 'biểu đồ moment, lớn nhất ' + mmax.toExponential(3) + ' N·mm',
        C.moment, 'left', 11);
    }

    mode(result) {
      const idx = Math.min(this.modeIndex, result.bucklingModes.length - 1);
      const phi = result.bucklingModes[idx];
      const model = result.model;
      let dmax = 0;
      for (let i = 0; i < model.nodes.length; i++) {
        dmax = Math.max(dmax, Math.hypot(phi[3 * i], phi[3 * i + 1]));
      }
      if (dmax <= 1e-12) return;
      const k = (0.10 * (this.w || 400)) / (dmax * this.sx);
      for (const e of model.elements) {
        const n1 = model.nodes[e.n1], n2 = model.nodes[e.n2];
        const a = this.W(n1.x + k * phi[3 * e.n1], n1.y + k * phi[3 * e.n1 + 1]);
        const b = this.W(n2.x + k * phi[3 * e.n2], n2.y + k * phi[3 * e.n2 + 1]);
        this.line(a, b, C.mode, 2);
      }
      this.text(10, 48, 'dạng mất ổn định ' + (idx + 1) + ', λ_cr = ' +
        (result.lambdas[idx] || 0).toFixed(2), C.mode, 'left', 11);
    }

    legend(result) {
      const a = result.assessment;
      const w = this.w || 400;
      const lines = [
        'hệ số tải cho phép  ' + a.lambdaAllow.toFixed(2),
        'quyết định bởi      ' + a.governedBy,
        'chuyển vị lớn nhất  ' + a.maxDisp.toFixed(1) + ' mm'
      ];
      lines.forEach((t, i) => this.text(w - 10, 16 + 15 * i, t, C.text, 'right', 11));
    }
  }

  root.PSAT.draw = { FrameView };
})(typeof globalThis !== 'undefined' ? globalThis : this);
