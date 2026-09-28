/* Đề xuất kỹ thuật, suy ra từ chính kết quả PTHH.
   Mỗi đề xuất đều gắn với một con số tính ra — không có lời khuyên chung chung. */
(function (root) {
  'use strict';
  const SF = root.PSAT.checks.SF;
  const THERMAL_ALPHA = root.PSAT.pipe.THERMAL_ALPHA;
  const memberLength = root.PSAT.analysis.memberLength;

  const hi = (t, s) => ({ level: '!', title: t, body: s });
  const mid = (t, s) => ({ level: '*', title: t, body: s });
  const info = (t, s) => ({ level: '-', title: t, body: s });

  function geometryNotes(p) {
    const out = [];
    const nsup = p.supports.length;
    const xs = p.members.flatMap(m => [m.x1, m.x2]);
    const ys = p.members.flatMap(m => [m.y1, m.y2]);
    const spanX = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const spanY = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    const diag = p.members.filter(m =>
      Math.abs(m.x2 - m.x1) > 1 && Math.abs(m.y2 - m.y1) > 1);

    if (nsup === 1 && !diag.length) {
      out.push(hi('Sơ đồ hiện tại là CÔNG XÔN không giằng',
        'Chỉ có 1 gối tựa và không có thanh chéo nào. Toàn bộ tải phải truyền về ' +
        'gối bằng UỐN — cách truyền lực kém hiệu quả nhất. Thêm một thanh chéo sẽ ' +
        'đổi phần lớn uốn thành lực dọc trục. Dạng phù hợp: giá đỡ công xôn có ' +
        'thanh chống chéo (cantilever bracket with diagonal brace).'));
    } else if (nsup === 1 && diag.length) {
      out.push(info('Sơ đồ: công xôn CÓ giằng chéo',
        'Đã có ' + diag.length + ' thanh chéo. Đây là cấu hình đúng cho giá đỡ ' +
        'kiểu console / bracket gắn vào cột hoặc tường.'));
    } else if (nsup >= 2 && spanX > 1) {
      out.push(info('Sơ đồ: khung nhiều gối (kiểu khung cổng / goal post)',
        nsup + ' gối tựa cách nhau ' + spanX.toFixed(0) + ' mm. Khung dạng này ' +
        'chịu tải tốt hơn nhiều so với công xôn và là lựa chọn tiêu chuẩn khi ống ' +
        'chạy giữa hai cột.'));
    }

    if (spanY > 3000 && nsup <= 2 && !diag.length) {
      out.push(mid('Cột cao ' + spanY.toFixed(0) + ' mm không có giằng',
        'Cột cao và không giằng rất nhạy với mất ổn định và chuyển vị ngang. ' +
        'Cân nhắc giằng chéo theo phương dọc tuyến ống, hoặc chuyển sang khung chữ A.'));
    }
    return out;
  }

  function resultAdvice(p, r) {
    const out = [];
    const a = r.assessment;
    const gov = a.governing;

    if (a.lambdaAllow >= 1) {
      out.push(info('ĐẠT — hệ số dư tải ' + a.lambdaAllow.toFixed(2),
        'Kết cấu chịu được tải hiện tại. Còn có thể tăng tải thêm ' +
        ((a.lambdaAllow - 1) * 100).toFixed(0) + '% trước khi chạm giới hạn (' +
        a.governedBy + ').'));
    } else {
      out.push(hi('KHÔNG ĐẠT — chỉ đạt ' + (a.lambdaAllow * 100).toFixed(0) + '% tải yêu cầu',
        'Phải tăng tiết diện, đổi sơ đồ, hoặc giảm nhịp ống. Yếu tố quyết định: ' +
        a.governedBy + '.'));
    }

    if (gov && gov.dominant === 'uốn' && gov.uBend > 0.35) {
      out.push(mid('Uốn chi phối ' + gov.name + ' — nên chuyển sang sơ đồ có giằng',
        'Ứng suất uốn ' + gov.fb.toFixed(0) + ' MPa chiếm ' +
        (gov.uBend * 100).toFixed(0) + '% khả năng, trong khi dọc trục chỉ ' +
        gov.fa.toFixed(0) + ' MPa. Một thanh chéo đặt từ gối đến gần điểm đặt lực ' +
        'sẽ biến phần lớn moment này thành lực dọc trục — thường tăng được 3–8 lần ' +
        'khả năng chịu tải mà không cần đổi tiết diện.'));
    }

    for (const c of a.members) {
      if (c.action === 'NÉN' && c.slenderness > 120) {
        out.push(mid(c.name + ' mảnh (KL/r = ' + c.slenderness.toFixed(0) + ')',
          'Khả năng chịu nén chỉ còn Fa = ' + c.Fa.toFixed(0) + ' MPa so với 0,6·Fy = ' +
          (0.6 * p.Fy).toFixed(0) + ' MPa — mất ' +
          ((1 - c.Fa / (0.6 * p.Fy)) * 100).toFixed(0) + '%. Xử lý theo thứ tự hiệu quả: ' +
          '(1) giằng giữa thanh để giảm chiều dài tính toán, (2) đổi sang tiết diện KÍN ' +
          '(hộp hoặc ống) vì cùng diện tích thì r lớn hơn thép góc rất nhiều, ' +
          '(3) cuối cùng mới tăng kích thước.'));
      }
    }

    if (a.lambdaBuckling > 0) {
      if (a.lambdaBuckling < SF) {
        out.push(hi('Mất ổn định tổng thể trước khi đạt giới hạn bền',
          'Hệ số tải tới hạn λ_cr = ' + a.lambdaBuckling.toFixed(2) +
          ' < hệ số an toàn ' + SF.toFixed(2) + '. Kết cấu sẽ mất ổn định ở ' +
          (a.lambdaBuckling * 100).toFixed(0) + '% tải hiện tại. Bắt buộc phải giằng.'));
      } else if (a.lambdaBuckling < 4) {
        out.push(mid('Ổn định tổng thể cần lưu ý (λ_cr = ' + a.lambdaBuckling.toFixed(2) + ')',
          'Dưới 4 thì hiệu ứng bậc hai (P-delta) bắt đầu đáng kể. Nếu làm thiết kế ' +
          'chính thức nên phân tích phi tuyến hình học hoặc dùng công thức khuếch đại moment.'));
      } else {
        out.push(info('Ổn định tổng thể tốt (λ_cr = ' + a.lambdaBuckling.toFixed(1) + ')',
          'Kết cấu còn xa ngưỡng mất ổn định đàn hồi.'));
      }
    }

    if (a.dispLimit > 0) {
      if (a.maxDisp > a.dispLimit) {
        out.push(hi('Chuyển vị ' + a.maxDisp.toFixed(1) + ' mm vượt giới hạn ' +
          a.dispLimit.toFixed(1) + ' mm',
          'Độ cứng uốn tỉ lệ với I, mà I tỉ lệ với chiều cao mũ ba. Tăng CHIỀU CAO ' +
          'tiết diện hiệu quả hơn nhiều so với tăng bề dày.'));
      } else {
        out.push(info('Chuyển vị ' + a.maxDisp.toFixed(1) + ' mm / giới hạn ' +
          a.dispLimit.toFixed(1) + ' mm — đạt', ''));
      }
    } else {
      out.push(info('Chuyển vị lớn nhất ' + a.maxDisp.toFixed(1) + ' mm',
        'Chưa đặt giới hạn chuyển vị để kiểm tra.'));
    }

    if (gov && gov.utilization < 0.35 && a.lambdaBuckling > 6) {
      out.push(info('Tiết diện còn dư nhiều (dùng ' + (gov.utilization * 100).toFixed(0) + '%)',
        'Có thể giảm kích thước để tiết kiệm. Dùng nút “Tự chọn tiết diện” để tìm ' +
        'phương án nhẹ nhất còn đạt.'));
    }

    for (const c of a.members) {
      for (const w of c.warnings) out.push(mid(c.name, w));
    }
    return out;
  }

  function sizingAdvice(p, r) {
    const out = [];
    for (const c of r.assessment.members) {
      if (c.utilization <= 1) continue;
      const need = [];
      if (c.uBend > 0 && c.fb > 0) {
        const Snow = Math.abs(c.M) / c.fb;
        const Sreq = Math.abs(c.M) / (0.6 * p.Fy);
        need.push('Sx ≥ ' + Sreq.toExponential(3) + ' mm³ (đang có ' +
          Snow.toExponential(3) + ' — thiếu ' + ((Sreq / Snow - 1) * 100).toFixed(0) + '%)');
      }
      if (c.uAxial > 0 && c.Fa > 0) {
        need.push('A ≥ ' + (Math.abs(c.N) / c.Fa).toFixed(0) + ' mm²');
      }
      out.push(hi(c.name + ' cần tăng tiết diện (đang dùng ' +
        (c.utilization * 100).toFixed(0) + '%)',
        'Ước lượng bậc một: ' + need.join('; ') + '. Vì khung siêu tĩnh sẽ phân bố ' +
        'lại nội lực khi đổi tiết diện, hãy dùng “Tự chọn tiết diện” để xác nhận.'));
    }
    return out;
  }

  function cryogenicNotes(fluid, material, dT, runLengthM) {
    const out = [];
    if (fluid.indexOf('LNG') < 0 && dT > -50) return out;

    let alpha, mat;
    if (material.indexOf('304') >= 0 || material.indexOf('316') >= 0) {
      alpha = THERMAL_ALPHA['Inox austenit']; mat = 'inox austenit';
    } else if (material.indexOf('Ni') >= 0) {
      alpha = THERMAL_ALPHA['Thép 9% Ni']; mat = 'thép 9% Ni';
    } else if (material.indexOf('hôm') >= 0) {
      alpha = THERMAL_ALPHA['Nhôm']; mat = 'nhôm';
    } else {
      alpha = THERMAL_ALPHA['Thép carbon']; mat = 'thép carbon';
    }
    const move = Math.abs(alpha * dT * runLengthM * 1000);

    out.push(hi('Co ngót vì lạnh: ' + move.toFixed(0) + ' mm trên ' +
      runLengthM.toFixed(0) + ' m tuyến',
      'Với ΔT = ' + dT.toFixed(0) + ' °C và hệ số giãn nở ' + alpha.toExponential(2) +
      '/°C của ' + mat + ', đoạn ống dài ' + runLengthM.toFixed(0) + ' m sẽ CO khoảng ' +
      move.toFixed(0) + ' mm. Gối đỡ phải cho phép chuyển vị này: dùng gối TRƯỢT hoặc ' +
      'CON LĂN, không ngàm cứng. Nếu chặn cứng, lực sinh ra có thể lớn gấp nhiều lần ' +
      'tải trọng lượng và sẽ phá hỏng cả giá đỡ lẫn ống.'));

    out.push(hi('Cầu nhiệt (cold bridge) tại vị trí gối đỡ',
      'Giá đỡ thép tiếp xúc trực tiếp ống lạnh sẽ dẫn nhiệt ra ngoài, gây đóng băng ' +
      'và làm thép giá đỡ giòn. Phải dùng GỐI ĐỠ LẠNH (cold shoe) với đệm chịu nén ' +
      'cách nhiệt — thường là cellular glass hoặc gỗ cứng tẩm — để ngăn tiếp xúc trực tiếp.'));

    out.push(mid('Vật liệu giá đỡ ở vùng có thể bị lạnh',
      'Thép carbon thông thường trở nên giòn ở nhiệt độ thấp. Phần giá đỡ có khả năng ' +
      'xuống dưới −29 °C phải dùng vật liệu chịu lạnh (inox austenit, hoặc thép có ' +
      'chứng nhận thử va đập ở nhiệt độ thiết kế).'));
    return out;
  }

  function allAdvice(p, r, fluid, material, dT, runLengthM) {
    let out = resultAdvice(p, r)
      .concat(geometryNotes(p))
      .concat(sizingAdvice(p, r));
    if (fluid || dT) out = out.concat(cryogenicNotes(fluid || '', material || '',
                                                     dT || 0, runLengthM || 0));
    const rank = { '!': 0, '*': 1, '-': 2 };
    return out.sort((a, b) => (rank[a.level] ?? 3) - (rank[b.level] ?? 3));
  }

  root.PSAT.advice = { allAdvice, resultAdvice, geometryNotes, sizingAdvice, cryogenicNotes };
})(typeof globalThis !== 'undefined' ? globalThis : this);
