/* Xuất báo cáo tính toán dạng văn bản. */
(function (root) {
  'use strict';
  const SF = root.PSAT.checks.SF;
  const DISCLAIMER = root.PSAT.data.DISCLAIMER;
  const memberLength = root.PSAT.analysis.memberLength;
  const loadComponents = root.PSAT.analysis.loadComponents;

  const LINE = '='.repeat(78);
  const THIN = '-'.repeat(78);
  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);

  function wrap(text, width) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      if (cur.length + w.length + 1 > width) { lines.push(cur); cur = w; }
      else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const para = (t, w) => wrap(t, w).map(l => '  ' + l).join('\n') + '\n\n';

  function build(p, r, advice, pipeInfo, sectionInfo) {
    const a = r.assessment;
    const o = [];
    o.push('\n' + LINE + '\nTÍNH TOÁN GIÁ ĐỠ ĐƯỜNG ỐNG\n' + LINE + '\n\n');
    o.push('Lập lúc : ' + new Date().toLocaleString('vi-VN') + '\n');
    o.push('Công cụ : Pipe Support Analysis — PTHH khung phẳng (bản web)\n');
    o.push('Phương pháp: phần tử dầm Euler-Bernoulli 2D, 6 bậc tự do;\n');
    o.push('             kiểm tra theo ứng suất cho phép (ASD), hệ số an toàn ' +
           SF.toFixed(2) + ';\n');
    o.push('             ổn định tổng thể bằng bài toán trị riêng (K + lambda*Kg).\n');

    if (pipeInfo) o.push('\n1. ĐƯỜNG ỐNG VÀ TẢI TRỌNG\n' + THIN + '\n' + pipeInfo);
    if (sectionInfo) o.push('\n2. TIẾT DIỆN THÉP GIÁ ĐỠ\n' + THIN + '\n' + sectionInfo);

    o.push('\n3. SƠ ĐỒ KẾT CẤU\n' + THIN + '\n');
    o.push('Vật liệu thép : Fy = ' + p.Fy.toFixed(0) + ' MPa, E = ' + p.E.toFixed(0) + ' MPa\n');
    o.push('Chia lưới     : ' + p.nseg + ' phần tử trên mỗi thanh, tổng ' +
           r.model.elements.length + ' phần tử, ' + r.model.nodes.length + ' nút\n');
    o.push('Hệ số chiều dài tính toán K = ' + p.Kfactor.toFixed(2) + '\n');
    o.push('Trọng lượng bản thân thanh: ' + (p.selfWeight ? 'có kể' : 'bỏ qua') + '\n');

    o.push('\nThanh:\n');
    p.members.forEach((m, i) => {
      o.push('  ' + pad(m.label || ('T' + (i + 1)), 10) +
        '(' + lpad(m.x1.toFixed(1), 8) + ',' + lpad(m.y1.toFixed(1), 8) + ') -> (' +
        lpad(m.x2.toFixed(1), 8) + ',' + lpad(m.y2.toFixed(1), 8) + ')  L=' +
        lpad(memberLength(m).toFixed(1), 8) + ' mm  ' + m.section.name + '\n');
    });
    o.push('\nGối tựa:\n');
    p.supports.forEach((s, i) => {
      o.push('  G' + pad(i + 1, 9) + '(' + lpad(s.x.toFixed(1), 8) + ',' +
        lpad(s.y.toFixed(1), 8) + ')  ' + s.kind + '\n');
    });
    o.push('\nTải tác dụng:\n');
    p.loads.forEach((l, i) => {
      const c = loadComponents(l);
      o.push('  ' + pad(l.label || ('P' + (i + 1)), 10) + '(' + lpad(l.x.toFixed(1), 8) +
        ',' + lpad(l.y.toFixed(1), 8) + ')  ' + lpad(l.magnitude.toFixed(1), 9) +
        ' N  góc ' + lpad(l.angle.toFixed(1), 6) + ' do  (Fx=' +
        lpad(c.fx.toFixed(1), 9) + '  Fy=' + lpad(c.fy.toFixed(1), 9) + ')\n');
    });

    o.push('\n4. NỘI LỰC VÀ KIỂM TRA THANH\n' + THIN + '\n');
    o.push(pad('Thanh', 10) + ' ' + pad('K/N', 4) + ' ' + lpad('N [N]', 11) + ' ' +
      lpad('M [N.mm]', 13) + ' ' + lpad('V [N]', 10) + ' ' + lpad('KL/r', 7) + ' ' +
      lpad('fb[MPa]', 7) + ' ' + lpad('Dùng', 6) + '\n');
    for (const c of a.members) {
      o.push(pad(c.name, 10) + ' ' + pad(c.action, 4) + ' ' +
        lpad(c.N.toFixed(0), 11) + ' ' + lpad(c.M.toExponential(4), 13) + ' ' +
        lpad(c.V.toFixed(0), 10) + ' ' + lpad(c.slenderness.toFixed(1), 7) + ' ' +
        lpad(c.fb.toFixed(1), 7) + ' ' +
        lpad((c.utilization * 100).toFixed(0) + '%', 6) + '\n');
    }
    o.push('\nChi tiết mặt cắt nguy hiểm:\n');
    for (const c of a.members) {
      o.push('  ' + pad(c.name, 10) + 'x = ' + lpad(c.xCrit.toFixed(1), 8) +
        ' mm dọc thanh  -> toạ độ (' + c.xyCrit[0].toFixed(1) + ', ' +
        c.xyCrit[1].toFixed(1) + ')\n');
      o.push('             fa=' + lpad(c.fa.toFixed(1), 7) + '/Fa=' + lpad(c.Fa.toFixed(1), 7) +
        '   fb=' + lpad(c.fb.toFixed(1), 7) + '/Fb=' + lpad(c.Fb.toFixed(1), 7) +
        '   fv=' + lpad(c.fv.toFixed(1), 7) + '/Fv=' + lpad(c.Fv.toFixed(1), 7) + '\n');
      o.push('             tổ hợp AISC H1-1 = ' + c.uCombined.toFixed(3) + '\n');
    }

    o.push('\n5. KẾT LUẬN\n' + THIN + '\n');
    o.push('Hệ số tải theo điều kiện BỀN        lambda_s  = ' +
      a.lambdaStrength.toFixed(3) + '\n');
    if (a.lambdaBuckling > 0) {
      o.push('Hệ số tải tới hạn theo ỔN ĐỊNH      lambda_cr = ' +
        a.lambdaBuckling.toFixed(3) + '\n');
      o.push('  (chia hệ số an toàn ' + SF.toFixed(2) + ' -> ' +
        (a.lambdaBuckling / SF).toFixed(3) + ')\n');
    } else {
      o.push('Ổn định tổng thể: ' + (a.bucklingNote || 'không xét') + '\n');
    }
    o.push('HỆ SỐ TẢI CHO PHÉP                 lambda    = ' + a.lambdaAllow.toFixed(3) + '\n');
    o.push('Quyết định bởi                     ' + a.governedBy + '\n');

    const tot = p.loads.reduce((s, l) => s + l.magnitude, 0);
    o.push('\nTải đang xét       = ' + lpad(tot.toFixed(1), 10) + ' N = ' +
      lpad((tot / 1000).toFixed(2), 7) + ' kN\n');
    o.push('TẢI TỐI ĐA CHỊU    = ' + lpad((tot * a.lambdaAllow).toFixed(1), 10) + ' N = ' +
      lpad((tot * a.lambdaAllow / 1000).toFixed(2), 7) + ' kN\n');
    o.push('\nChuyển vị lớn nhất = ' + a.maxDisp.toFixed(2) + ' mm tại nút ' + a.maxDispNode +
      (a.dispLimit > 0 ? ('  (giới hạn ' + a.dispLimit.toFixed(1) + ' mm - ' +
        (a.dispOk ? 'ĐẠT' : 'VƯỢT') + ')') : '') + '\n');
    o.push('\nKẾT LUẬN: ' + (a.lambdaAllow >= 1 && a.dispOk ? 'ĐẠT' : 'KHÔNG ĐẠT') + '\n');

    if (advice && advice.length) {
      o.push('\n6. NHẬN XÉT VÀ ĐỀ XUẤT\n' + THIN + '\n');
      const mark = { '!': '[QUAN TRỌNG]', '*': '[LƯU Ý]     ', '-': '[thông tin] ' };
      for (const it of advice) {
        o.push((mark[it.level] || '            ') + ' ' + it.title + '\n');
        if (it.body) for (const l of wrap(it.body, 74)) o.push('             ' + l + '\n');
        o.push('\n');
      }
    }

    if (r.notes && r.notes.length) {
      o.push('\n7. GHI CHÚ TỪ CHƯƠNG TRÌNH\n' + THIN + '\n');
      for (const n of r.notes) for (const l of wrap(n, 76)) o.push('  ' + l + '\n');
    }

    o.push('\nGIỚI HẠN CỦA KẾT QUẢ\n' + THIN + '\n');
    o.push(para('Mô hình là KHUNG PHẲNG 2D, nút cứng (hàn). Không xét: xoắn, ổn định ' +
      'ngang của dầm (LTB), ổn định cục bộ của bản thành, mỏi, tải trọng động và rung, ' +
      'động đất, gió, và liên kết bu-lông / mối hàn. Tiết diện coi là đặc chắc.', 76));
    o.push(para('Kiểm tra theo ứng suất cho phép với Fb = 0,6*Fy, không cộng thêm dự trữ ' +
      'dẻo - kết quả THIÊN VỀ AN TOÀN so với AISC 360 đầy đủ.', 76));
    o.push(para(DISCLAIMER, 76));
    o.push(para('Kết quả này là công cụ SÀNG LỌC và định cỡ sơ bộ. Hồ sơ thiết kế phát ' +
      'hành phải được kỹ sư có thẩm quyền kiểm tra độc lập.', 76));
    return o.join('');
  }

  root.PSAT.report = { build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
