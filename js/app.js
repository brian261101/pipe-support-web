/* Lớp giao diện: đọc DOM → chạy phân tích → hiển thị. */
(function () {
  'use strict';
  const P = window.PSAT;
  const D = P.data, SC = P.sections, PP = P.pipe, AN = P.analysis,
        AD = P.advice, RP = P.report;

  const $ = id => document.getElementById(id);
  const el = (tag, attrs, kids) => {
    const n = document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of (kids || [])) n.appendChild(c);
    return n;
  };
  const num = (v, d) => {
    const x = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(x) ? x : (d === undefined ? 0 : d);
  };
  const opts = (sel, arr, val) => {
    sel.innerHTML = '';
    for (const v of arr) sel.appendChild(el('option', { value: v, text: v }));
    if (val !== undefined && arr.indexOf(val) >= 0) sel.value = val;
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  };

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function dialog(title, bodyNode) {
    $('dlg-title').textContent = title;
    const b = $('dlg-body');
    b.innerHTML = '';
    b.appendChild(bodyNode);
    $('dlg').showModal();
  }
  function errorDialog(title, msg) {
    dialog(title, el('div', { style: 'white-space:pre-wrap;font-size:13px;color:var(--fg2)',
                              text: msg }));
  }

  /* ================= trạng thái ================= */
  const lib = {};      // thư viện tiết diện
  let view = null;
  let lastResult = null, lastProject = null, lastPipe = null, lastSpan = null;

  /* ================= tab ================= */
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]');
    if (!b) return;
    for (const x of $('tabs').children) x.classList.toggle('on', x === b);
    for (const p of document.querySelectorAll('.pane')) p.classList.toggle('on', p.id === b.dataset.p);
  });

  /* ================= tab 1: ống ================= */
  function fillStandards() {
    opts($('std-group'), Object.keys(D.STANDARDS), 'LNG / NG — nhà máy, công nghệ');
    fillStd();
  }
  function fillStd() {
    const grp = D.STANDARDS[$('std-group').value];
    opts($('std'), grp.map(x => x[0]));
    stdNote();
  }
  function stdNote() {
    for (const grp of Object.values(D.STANDARDS)) {
      for (const [code, desc] of grp) if (code === $('std').value) { $('std-note').textContent = desc; return; }
    }
  }
  function fillSched() {
    const nps = $('nps').value;
    const list = D.schedulesFor(nps);
    opts($('sch'), list, list.indexOf('40 (STD)') >= 0 ? '40 (STD)' : list[0]);
    applySched();
  }
  function applySched() {
    const od = D.PIPE_OD[$('nps').value];
    const t = (D.PIPE_WALL[$('nps').value] || {})[$('sch').value];
    if (od) $('od').value = od;
    if (t) $('tw').value = t;
  }

  function calcPipe() {
    try {
      const mat = D.PIPE_MATERIALS[$('pmat').value];
      const rhoIns = D.INSULATION[$('ins').value][0];
      const pl = PP.pipeLoad(num($('od').value), num($('tw').value), mat[0],
        num($('rhof').value), num($('tins').value), rhoIns,
        num($('corr').value), num($('extra').value));
      const sr = PP.maxSpan(pl.wTotal, pl.Z, pl.I, mat[1],
        num($('sigall').value, PP.B31_1_SIGMA), num($('sag').value, PP.B31_1_SAG),
        $('scheme').value);
      lastPipe = pl; lastSpan = sr;

      const L = [];
      L.push('TẢI TRỌNG ĐƯỜNG ỐNG');
      L.push('─'.repeat(56));
      L.push('Thành phần'.padEnd(26) + 'N/mm'.padStart(12) + 'kg/m'.padStart(12));
      for (const [n, w, kg] of pl.breakdown()) {
        L.push(n.padEnd(26) + w.toFixed(4).padStart(12) + kg.toFixed(2).padStart(12));
      }
      L.push('');
      L.push('Đặc trưng tiết diện ống (đã trừ ăn mòn):');
      L.push('  A = ' + pl.Ametal.toFixed(0) + ' mm²   I = ' + pl.I.toExponential(4) +
             ' mm⁴   Z = ' + pl.Z.toExponential(4) + ' mm³');
      L.push('');
      L.push('KHOẢNG CÁCH GỐI ĐỠ');
      L.push('─'.repeat(56));
      L.push('  Sơ đồ                  : ' + sr.scheme);
      L.push('  Theo ứng suất (' + sr.sigmaAllow + ' MPa) : ' + sr.Lstress.toFixed(0).padStart(7) + ' mm');
      L.push('  Theo độ võng  (' + sr.sagAllow + ' mm)  : ' + sr.Ldefl.toFixed(0).padStart(7) + ' mm');
      L.push('  → CHỌN                 : ' + sr.Lmax.toFixed(0).padStart(7) +
             ' mm  (quyết định bởi ' + sr.governedBy + ')');
      L.push('');
      L.push('PHẢN LỰC MỘT GỐI ĐỠ');
      L.push('─'.repeat(56));
      const N = PP.supportReaction(pl.wTotal, sr.Lmax);
      L.push('  N = w × L = ' + pl.wTotal.toFixed(4) + ' × ' + sr.Lmax.toFixed(0) +
             ' = ' + N.toFixed(0) + ' N = ' + (N / 1000).toFixed(2) + ' kN');
      L.push('');
      L.push(D.DISCLAIMER);
      $('pipe-out').textContent = L.join('\n');
      toast('Đã tính tải ống.');
    } catch (exc) {
      errorDialog('Lỗi tính ống', exc.message);
    }
  }

  function pushLoad() {
    if (!lastPipe || !lastSpan) calcPipe();
    if (!lastPipe) return;
    const N = PP.supportReaction(lastPipe.wTotal, lastSpan.Lmax);
    const rows = $('t-load').tBodies[0].rows;
    if (!rows.length) addLoadRow();
    rows[0].querySelector('[data-k=N]').value = N.toFixed(0);
    rows[0].querySelector('[data-k=ang]').value = '-90';
    document.querySelector('#tabs button[data-p=p3]').click();
    toast('Đã đưa N = ' + N.toFixed(0) + ' N vào dòng lực đầu tiên.');
  }

  /* ================= tab 2: tiết diện ================= */
  function fillShapes() {
    opts($('shape'), Object.keys(SC.SHAPES), 'Hộp vuông–CN (SHS / RHS)');
    shapeFields();
    $('preset-warn').textContent = SC.PRESET_WARNING;
  }
  function shapeFields() {
    const spec = SC.SHAPES[$('shape').value];
    const wrap = $('dims');
    wrap.innerHTML = '';
    const def = SC.DEFAULT_DIMS[spec.key] || [];
    spec.dims.forEach((lab, i) => {
      wrap.appendChild(el('div', {}, [
        el('label', { class: 'f', text: lab + ' [mm]' }),
        el('input', { 'data-d': i, value: def[i] !== undefined ? def[i] : '' })
      ]));
    });
    const names = [];
    for (const [, list] of Object.entries(SC.PRESETS)) {
      if (list.length && list[0][1] === spec.key) for (const [n] of list) names.push(n);
    }
    opts($('preset'), [''].concat(names));
  }
  function applyPreset() {
    const want = $('preset').value;
    if (!want) return;
    for (const list of Object.values(SC.PRESETS)) {
      for (const [name, , dims] of list) {
        if (name === want) {
          document.querySelectorAll('#dims input').forEach((inp, i) => {
            if (dims[i] !== undefined) inp.value = dims[i];
          });
          $('secname').value = name;
          return;
        }
      }
    }
  }
  function addSection() {
    try {
      const spec = SC.SHAPES[$('shape').value];
      const dims = Array.from(document.querySelectorAll('#dims input')).map(i => num(i.value));
      const sp = SC.build(spec.key, dims, $('secname').value.trim());
      lib[sp.name] = sp;
      refreshSecTable();
      $('sec-out').textContent = sp.name + '\n' + sp.summary() + (sp.note ? '\n' + sp.note : '');
      toast('Đã thêm ' + sp.name);
    } catch (exc) {
      errorDialog('Lỗi tiết diện', exc.message);
    }
  }
  function refreshSecTable() {
    const tb = $('sec-tbl').tBodies[0];
    tb.innerHTML = '';
    for (const [name, sp] of Object.entries(lib)) {
      const tr = el('tr', {}, [
        el('td', { text: name }),
        el('td', { text: sp.A.toFixed(0) }),
        el('td', { text: sp.Ix.toExponential(3) }),
        el('td', { text: sp.Sx.toExponential(3) }),
        el('td', { text: SC.rMinEffective(sp).toFixed(1) }),
        el('td', { text: sp.massPerM().toFixed(2) })
      ]);
      const td = el('td');
      const b = el('button', { class: 'tiny del', text: '×' });
      b.onclick = () => { delete lib[name]; refreshSecTable(); refreshSectionSelects(); };
      td.appendChild(b);
      tr.appendChild(td);
      tb.appendChild(tr);
    }
    refreshSectionSelects();
  }
  function refreshSectionSelects() {
    const names = Object.keys(lib);
    for (const sel of document.querySelectorAll('#t-mem select[data-k=sec]')) {
      const cur = sel.value;
      opts(sel, names, names.indexOf(cur) >= 0 ? cur : names[0]);
    }
  }

  /* ================= tab 3: bảng khung ================= */
  function cell(kind, k, val, extra) {
    const td = el('td', { class: kind === 'num' ? 'num' : '' });
    let inp;
    if (kind === 'sel') {
      inp = el('select', { 'data-k': k });
      opts(inp, extra, val);
    } else {
      inp = el('input', { 'data-k': k, value: val });
    }
    inp.addEventListener('change', drawOnly);
    inp.addEventListener('input', drawOnly);
    td.appendChild(inp);
    return td;
  }
  function delCell(tr) {
    const td = el('td');
    const b = el('button', { class: 'tiny del', text: '×' });
    b.onclick = () => { tr.remove(); drawOnly(); };
    td.appendChild(b);
    return td;
  }
  function addMemRow(d) {
    d = d || { label: '', x1: 0, y1: 0, x2: 0, y2: 1000, sec: Object.keys(lib)[0], exp: 'Tự động' };
    const tb = $('t-mem').tBodies[0];
    const tr = el('tr');
    tr.appendChild(cell('txt', 'label', d.label || ('T' + (tb.rows.length + 1))));
    for (const k of ['x1', 'y1', 'x2', 'y2']) tr.appendChild(cell('num', k, d[k]));
    tr.appendChild(cell('sel', 'sec', d.sec, Object.keys(lib)));
    tr.appendChild(cell('sel', 'exp', d.exp, ['Tự động', 'Kéo', 'Nén']));
    tr.appendChild(delCell(tr));
    tb.appendChild(tr);
    drawOnly();
  }
  function addLoadRow(d) {
    d = d || { label: '', x: 0, y: 0, N: 5000, ang: -90 };
    const tb = $('t-load').tBodies[0];
    const tr = el('tr');
    tr.appendChild(cell('txt', 'label', d.label || ('P' + (tb.rows.length + 1))));
    for (const k of ['x', 'y', 'N', 'ang']) tr.appendChild(cell('num', k, d[k]));
    tr.appendChild(delCell(tr));
    tb.appendChild(tr);
    drawOnly();
  }
  function addSupRow(d) {
    d = d || { x: 0, y: 0, kind: 'Ngàm' };
    const tb = $('t-sup').tBodies[0];
    const tr = el('tr');
    for (const k of ['x', 'y']) tr.appendChild(cell('num', k, d[k]));
    tr.appendChild(cell('sel', 'kind', d.kind,
      ['Ngàm', 'Khớp', 'Con lăn đứng', 'Con lăn ngang']));
    tr.appendChild(delCell(tr));
    tb.appendChild(tr);
    drawOnly();
  }

  function rowsOf(id) {
    return Array.from($(id).tBodies[0].rows).map(tr => {
      const o = {};
      for (const inp of tr.querySelectorAll('[data-k]')) o[inp.dataset.k] = inp.value;
      return o;
    });
  }

  function gather() {
    const u = num($('unit').value, 1);
    const members = rowsOf('t-mem').map(r => {
      const sp = lib[r.sec];
      if (!sp) throw AN.InputError('Thanh ' + r.label + ' dùng tiết diện "' + r.sec +
        '" không còn trong thư viện.');
      return { x1: num(r.x1) * u, y1: num(r.y1) * u, x2: num(r.x2) * u, y2: num(r.y2) * u,
               section: sp, expected: r.exp, label: r.label };
    });
    const loads = rowsOf('t-load').map(r => ({
      x: num(r.x) * u, y: num(r.y) * u, magnitude: num(r.N), angle: num(r.ang, -90),
      label: r.label }));
    const supports = rowsOf('t-sup').map(r => ({
      x: num(r.x) * u, y: num(r.y) * u, kind: r.kind }));

    const st = D.SUPPORT_STEEL[$('steel').value];
    return { members, loads, supports,
      Fy: st[0], E: st[2], rhoSteel: st[3],
      nseg: Math.round(num($('nseg').value, 4)),
      Kfactor: num($('kfac').value, 1),
      dispLimit: num($('dlim').value, 0),
      selfWeight: $('sw').checked, doBuckling: $('buck').checked };
  }

  /* ================= chạy ================= */
  function run() {
    let p, r;
    try { p = gather(); r = AN.run(p); }
    catch (exc) {
      errorDialog(exc.name === 'InputError' ? 'Dữ liệu chưa hợp lệ' : 'Lỗi khi giải',
                  exc.message);
      return;
    }
    lastProject = p; lastResult = r;
    showResult(p, r);
    view.setData(p, r);
    document.querySelector('#tabs button[data-p=p4]').click();
    saveState();
    toast('Xong: ' + r.model.elements.length + ' phần tử, ' + r.model.nodes.length + ' nút.');
  }

  function showResult(p, r) {
    const a = r.assessment;
    const ok = a.lambdaAllow >= 1 && a.dispOk;
    const v = $('verdict');
    v.className = 'verdict ' + (ok ? 'ok' : 'no');
    v.textContent = ok
      ? ('ĐẠT — hệ số dư tải ' + a.lambdaAllow.toFixed(2))
      : ('KHÔNG ĐẠT — chỉ đạt ' + (a.lambdaAllow * 100).toFixed(0) + '% tải yêu cầu');

    const tot = p.loads.reduce((s, l) => s + l.magnitude, 0);
    $('verdict-sub').textContent =
      'Tải đang xét ' + (tot / 1000).toFixed(2) + ' kN → tải tối đa chịu được ' +
      (tot * a.lambdaAllow / 1000).toFixed(2) + ' kN. Quyết định bởi: ' + a.governedBy +
      '. Chuyển vị lớn nhất ' + a.maxDisp.toFixed(1) + ' mm.';

    const tb = $('res-tbl').tBodies[0];
    tb.innerHTML = '';
    for (const c of a.members) {
      const tr = el('tr', { class: c.utilization > 1 ? 'bad' : '' }, [
        el('td', { text: c.name }), el('td', { text: c.action }),
        el('td', { text: c.N.toFixed(0) }), el('td', { text: c.M.toExponential(3) }),
        el('td', { text: c.V.toFixed(0) }), el('td', { text: c.slenderness.toFixed(1) }),
        el('td', { text: (c.utilization * 100).toFixed(0) + '%' })
      ]);
      tb.appendChild(tr);
    }

    const dT = $('fluid').value.indexOf('LNG') >= 0 ? -162 : 0;
    const runM = lastSpan ? lastSpan.Lmax / 1000 * 10 : 0;
    const items = AD.allAdvice(p, r, $('fluid').value, $('pmat').value, dT, runM);
    const box = $('adv');
    box.innerHTML = '';
    const cls = { '!': 'lv-hi', '*': 'lv-mid', '-': 'lv-info' };
    for (const it of items) {
      box.appendChild(el('div', { class: 'item ' + (cls[it.level] || '') }, [
        el('div', { class: 't', text: '● ' + it.title }),
        el('div', { class: 'b', text: it.body || '' })
      ]));
    }

    let pinfo = '';
    if (lastPipe && lastSpan) {
      pinfo = 'Ống  : OD ' + lastPipe.OD.toFixed(1) + ' x t ' + lastPipe.tCorroded.toFixed(2) +
        ' mm, ' + $('pmat').value + '\nMôi chất: ' + $('fluid').value +
        '\nBảo ôn : ' + $('ins').value + ' dày ' + num($('tins').value) + ' mm\n' +
        'Tải phân bố w = ' + lastPipe.wTotal.toFixed(4) + ' N/mm (' +
        lastPipe.kgPerM(lastPipe.wTotal).toFixed(2) + ' kg/m)\n' +
        'Khoảng cách gối đỡ chọn ' + lastSpan.Lmax.toFixed(0) + ' mm (quyết định bởi ' +
        lastSpan.governedBy + ')\nPhản lực một gối N = ' +
        PP.supportReaction(lastPipe.wTotal, lastSpan.Lmax).toFixed(0) + ' N\n';
    }
    const used = new Set(p.members.map(m => m.section.name));
    let sinfo = '';
    for (const n of used) {
      sinfo += '  ' + n.padEnd(16) + lib[n].summary().replace(/\n/g, '\n' + ' '.repeat(18)) + '\n';
    }
    $('report').textContent = RP.build(p, r, items, pinfo, sinfo);
  }

  function drawOnly() {
    try {
      const p = gather();
      view.setData(p, (lastProject && sameShape(p, lastProject)) ? lastResult : null);
    } catch (e) { /* đang nhập dở — bỏ qua */ }
  }
  function sameShape(a, b) {
    if (!a || !b || a.members.length !== b.members.length) return false;
    for (let i = 0; i < a.members.length; i++) {
      const x = a.members[i], y = b.members[i];
      if (x.x1 !== y.x1 || x.y1 !== y.y1 || x.x2 !== y.x2 || x.y2 !== y.y2 ||
          x.section.name !== y.section.name) return false;
    }
    return a.loads.length === b.loads.length && a.supports.length === b.supports.length;
  }

  /* ================= tự chọn tiết diện ================= */
  function autoSize() {
    let p;
    try { p = gather(); } catch (exc) { errorDialog('Dữ liệu chưa hợp lệ', exc.message); return; }
    const cands = Object.values(lib);
    if (cands.length < 2) {
      errorDialog('Cần thêm tiết diện',
        'Thư viện chỉ có ' + cands.length + ' tiết diện. Hãy thêm vài phương án ở tab ' +
        '“Tiết diện thép” rồi chạy lại — công cụ sẽ giải lại toàn bộ bài toán PTHH cho ' +
        'từng phương án và chọn cái nhẹ nhất còn đạt.');
      return;
    }
    const res = AN.autoSize(p, cands);
    const tbl = el('table', { class: 'rtbl' });
    tbl.innerHTML = '<thead><tr><th>Tiết diện</th><th>kg/m</th><th>Hệ số tải</th>' +
      '<th>Sử dụng</th><th>Kết luận</th></tr></thead>';
    const tb = el('tbody');
    let best = null;
    for (const row of res) {
      let lam = '—', u = '—', verdict;
      if (!row.result) {
        verdict = 'Không giải được';
      } else {
        lam = row.result.assessment.lambdaAllow.toFixed(2);
        const g = row.result.assessment.governing;
        u = g ? (g.utilization * 100).toFixed(0) + '%' : '—';
        if (row.ok && !best) { best = row.section; verdict = 'ĐẠT — nhẹ nhất'; }
        else verdict = row.ok ? 'ĐẠT' : 'không đạt';
      }
      tb.appendChild(el('tr', {}, [
        el('td', { text: row.section.name }),
        el('td', { text: row.section.massPerM().toFixed(2) }),
        el('td', { text: lam }), el('td', { text: u }), el('td', { text: verdict })
      ]));
    }
    tbl.appendChild(tb);

    const box = el('div', {}, [
      el('p', { class: 'note', text: 'Mỗi phương án được giải lại toàn bộ bài toán PTHH ' +
        '(đổi độ cứng sẽ phân bố lại nội lực trong khung siêu tĩnh).' }),
      tbl,
      el('p', { style: 'margin-top:10px;font-weight:600',
        text: best ? ('Phương án nhẹ nhất còn đạt: ' + best.name + ' (' +
                      best.massPerM().toFixed(2) + ' kg/m)')
                   : 'Không tiết diện nào trong thư viện đạt — cần tăng kích thước hoặc ' +
                     'đổi sơ đồ (thêm thanh chéo).' })
    ]);
    dialog('Tự chọn tiết diện', box);
  }

  /* ================= tự kiểm chứng ================= */
  function runVerify() {
    const rows = P.verify.runVerification();
    const tbl = el('table', { class: 'rtbl' });
    tbl.innerHTML = '<thead><tr><th>Bài toán</th><th>PTHH</th><th>Giải tích</th>' +
      '<th>Kết quả</th></tr></thead>';
    const tb = el('tbody');
    let bad = 0;
    for (const r of rows) {
      if (!r.ok) bad++;
      tb.appendChild(el('tr', { class: r.ok ? '' : 'bad' }, [
        el('td', { text: r.name }),
        el('td', { text: Number(r.got).toPrecision(6) }),
        el('td', { text: Number(r.want).toPrecision(6) }),
        el('td', { html: r.ok ? '<span class="badge ok">đạt</span>'
                              : '<span class="badge no">SAI</span>' })
      ]));
    }
    tbl.appendChild(tb);
    dialog('Tự kiểm chứng solver — ' + (bad ? (bad + ' phép SAI') : 'tất cả đều đạt'),
      el('div', {}, [
        el('p', { class: 'note', text: 'So kết quả solver với nghiệm giải tích đã biết. ' +
          'Chạy ngay trong trình duyệt của bạn.' }),
        tbl
      ]));
  }

  /* ================= báo cáo ================= */
  function downloadReport() {
    if (!lastResult) { toast('Bấm TÍNH trước đã.'); return; }
    const blob = new Blob([$('report').textContent], { type: 'text/plain;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'bao_cao_gia_do.txt' });
    document.body.appendChild(a); a.click(); a.remove();
    toast('Đã tải báo cáo.');
  }

  /* ================= lưu / nạp ================= */
  function saveState() {
    try {
      store.set('psat.v1', JSON.stringify({
        unit: $('unit').value, steel: $('steel').value,
        nseg: $('nseg').value, kfac: $('kfac').value, dlim: $('dlim').value,
        sw: $('sw').checked, buck: $('buck').checked,
        nps: $('nps').value, sch: $('sch').value, od: $('od').value, tw: $('tw').value,
        pmat: $('pmat').value, fluid: $('fluid').value, rhof: $('rhof').value,
        ins: $('ins').value, tins: $('tins').value,
        lib: Object.values(lib).map(s => ({ name: s.name, shape: s.shape,
          dims: s._dims || null })),
        mem: rowsOf('t-mem'), load: rowsOf('t-load'), sup: rowsOf('t-sup')
      }));
    } catch (e) { /* bỏ qua */ }
  }
  function loadState() {
    const raw = store.get('psat.v1');
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      const set = (id, v) => { if (v !== undefined && v !== null) $(id).value = v; };
      set('unit', s.unit); set('steel', s.steel); set('nseg', s.nseg);
      set('kfac', s.kfac); set('dlim', s.dlim);
      $('sw').checked = s.sw !== false; $('buck').checked = s.buck !== false;
      set('nps', s.nps); fillSched(); set('sch', s.sch);
      set('od', s.od); set('tw', s.tw);
      set('pmat', s.pmat); set('fluid', s.fluid); set('rhof', s.rhof);
      set('ins', s.ins); set('tins', s.tins);
      for (const d of (s.lib || [])) {
        if (d && d.dims && !lib[d.name]) {
          try { lib[d.name] = SC.build(d.shape, d.dims, d.name); } catch (e) { /* bỏ qua */ }
        }
      }
      refreshSecTable();
      $('t-mem').tBodies[0].innerHTML = '';
      $('t-load').tBodies[0].innerHTML = '';
      $('t-sup').tBodies[0].innerHTML = '';
      (s.mem || []).forEach(addMemRow);
      (s.load || []).forEach(addLoadRow);
      (s.sup || []).forEach(addSupRow);
      return (s.mem || []).length > 0;
    } catch (e) { return false; }
  }

  /* ================= ví dụ ================= */
  function loadExample() {
    $('unit').value = '1000';
    $('t-mem').tBodies[0].innerHTML = '';
    $('t-load').tBodies[0].innerHTML = '';
    $('t-sup').tBodies[0].innerHTML = '';
    addMemRow({ label: 'A', x1: 1, y1: 1, x2: 1, y2: 5, sec: 'SHS 100x100x5', exp: 'Tự động' });
    addMemRow({ label: 'B', x1: 1, y1: 5, x2: 4, y2: 5, sec: 'SHS 100x100x5', exp: 'Tự động' });
    addMemRow({ label: 'C-giằng', x1: 1, y1: 3, x2: 3, y2: 5, sec: 'L75x75x6', exp: 'Nén' });
    addLoadRow({ label: 'P', x: 3, y: 5, N: 5000, ang: -90 });
    addSupRow({ x: 1, y: 1, kind: 'Ngàm' });
    addSupRow({ x: 1, y: 3, kind: 'Khớp' });
    drawOnly();
    toast('Đã nạp ví dụ (đơn vị mét). Bấm TÍNH.');
  }

  /* ================= khởi tạo ================= */
  function init() {
    fillStandards();
    opts($('nps'), Object.keys(D.PIPE_OD), '6');
    fillSched();
    opts($('pmat'), Object.keys(D.PIPE_MATERIALS), 'A312 TP304 / 304L (inox austenit)');
    opts($('fluid'), Object.keys(D.FLUIDS), D.DEFAULT_FLUID);
    opts($('ins'), Object.keys(D.INSULATION), 'Cellular glass (Foamglas)');
    opts($('scheme'), Object.keys(PP.SPAN_SCHEMES), PP.DEFAULT_SPAN_SCHEME);
    opts($('steel'), Object.keys(D.SUPPORT_STEEL), D.DEFAULT_STEEL);
    fillShapes();

    for (const [n, sh, d] of [['SHS 100x100x5', 'rect_hss', [100, 100, 5]],
                              ['L75x75x6', 'angle', [75, 75, 6]],
                              ['C100x50x5x6', 'channel', [100, 50, 5, 6]],
                              ['SHS 125x125x6', 'rect_hss', [125, 125, 6]],
                              ['SHS 150x150x8', 'rect_hss', [150, 150, 8]],
                              ['H150x150x7x10', 'i_beam', [150, 150, 7, 10]],
                              ['H200x200x8x12', 'i_beam', [200, 200, 8, 12]]]) {
      lib[n] = SC.build(sh, d, n);
    }
    refreshSecTable();

    view = new P.draw.FrameView($('view'));
    window.addEventListener('resize', () => view.resize());

    $('std-group').onchange = fillStd;
    $('std').onchange = stdNote;
    $('nps').onchange = fillSched;
    $('sch').onchange = applySched;
    $('pmat').onchange = () => { $('pmat-note').textContent = D.PIPE_MATERIALS[$('pmat').value][2]; };
    $('fluid').onchange = () => {
      const f = D.FLUIDS[$('fluid').value];
      $('rhof').value = f[0];
      $('fluid-note').textContent = f[1];
    };
    $('ins').onchange = () => { if (D.INSULATION[$('ins').value][0] === 0) $('tins').value = 0; };
    $('steel').onchange = () => {
      const s = D.SUPPORT_STEEL[$('steel').value];
      $('steel-note').textContent = 'Fy = ' + s[0] + ' MPa · Fu = ' + s[1] +
        ' MPa · E = ' + s[2] + ' MPa. ' + s[4];
    };
    $('shape').onchange = shapeFields;
    $('preset').onchange = applyPreset;
    $('btn-addsec').onclick = addSection;
    $('btn-pipe').onclick = calcPipe;
    $('btn-push').onclick = pushLoad;
    $('add-mem').onclick = () => addMemRow();
    $('add-load').onclick = () => addLoadRow();
    $('add-sup').onclick = () => addSupRow();
    $('btn-run').onclick = run;
    $('btn-autosize').onclick = autoSize;
    $('btn-verify').onclick = runVerify;
    $('btn-report').onclick = downloadReport;
    $('btn-example').onclick = loadExample;
    $('unit').onchange = drawOnly;
    for (const id of ['v-defl', 'v-mom', 'v-mode']) {
      $(id).onchange = () => {
        view.showDeflection = $('v-defl').checked;
        view.showMoment = $('v-mom').checked;
        view.showMode = $('v-mode').checked;
        view.redraw();
      };
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'F5' && !e.ctrlKey) { e.preventDefault(); run(); }
    });

    $('pmat').onchange(); $('fluid').onchange(); $('steel').onchange();

    if (!loadState()) loadExample();
    view.resize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
