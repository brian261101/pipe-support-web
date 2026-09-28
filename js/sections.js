/* Đặc trưng hình học tiết diện thép.

   Mọi đặc trưng đều được TÍNH TỪ KÍCH THƯỚC người dùng nhập, không tra bảng.
   Nhờ vậy không có số liệu nào bị bịa ra. Các "preset" chỉ điền sẵn kích thước
   danh nghĩa thường gặp — vẫn phải đối chiếu catalogue nhà sản xuất.

   Bỏ qua bán kính lượn góc → kết quả thiên về AN TOÀN.
   Đơn vị: mm, mm², mm⁴, mm³. */
(function (root) {
  'use strict';

  function props(o) {
    o.rx = o.A > 0 ? Math.sqrt(o.Ix / o.A) : 0;
    o.ry = o.A > 0 ? Math.sqrt(o.Iy / o.A) : 0;
    o.rmin = Math.min(o.rx, o.ry);
    o.Imin = Math.min(o.Ix, o.Iy);
    o.massPerM = function (rho) { return o.A * 1e-6 * (rho || 7850); };
    o.summary = function () {
      return 'A = ' + o.A.toFixed(0) + ' mm²   Ix = ' + o.Ix.toExponential(3) +
        ' mm⁴   Iy = ' + o.Iy.toExponential(3) + ' mm⁴\n' +
        'Sx = ' + o.Sx.toExponential(3) + ' mm³   Sy = ' + o.Sy.toExponential(3) + ' mm³\n' +
        'rx = ' + o.rx.toFixed(1) + ' mm   ry = ' + o.ry.toFixed(1) +
        ' mm   r_min = ' + rMinEffective(o).toFixed(1) + ' mm\n' +
        'khối lượng = ' + o.massPerM().toFixed(2) + ' kg/m';
    };
    return o;
  }

  function roundHSS(D, t, name) {
    if (t <= 0 || D <= 2 * t) throw new Error('Ống tròn: cần D > 2t và t > 0.');
    const d = D - 2 * t;
    const A = Math.PI / 4 * (D * D - d * d);
    const I = Math.PI / 64 * (D ** 4 - d ** 4);
    const S = I / (D / 2), Z = (D ** 3 - d ** 3) / 6;
    return props({ name: name || ('PIPE ' + D + 'x' + t), shape: 'round_hss',
      A, Ix: I, Iy: I, Sx: S, Sy: S, Zx: Z, Zy: Z, Av: 0.5 * A, h: D, b: D,
      closed: true, note: '' });
  }

  function solidRound(D, name) {
    const A = Math.PI / 4 * D * D, I = Math.PI / 64 * D ** 4;
    return props({ name: name || ('ROUND D' + D), shape: 'solid_round',
      A, Ix: I, Iy: I, Sx: I / (D / 2), Sy: I / (D / 2),
      Zx: D ** 3 / 6, Zy: D ** 3 / 6, Av: 0.9 * A, h: D, b: D,
      closed: true, note: '' });
  }

  function rectHSS(H, B, t, name) {
    if (t <= 0 || H <= 2 * t || B <= 2 * t)
      throw new Error('Hộp: cần H > 2t, B > 2t, t > 0.');
    const hi = H - 2 * t, bi = B - 2 * t;
    const A = H * B - hi * bi;
    const Ix = (B * H ** 3 - bi * hi ** 3) / 12;
    const Iy = (H * B ** 3 - hi * bi ** 3) / 12;
    return props({ name: name || ('SHS ' + H + 'x' + B + 'x' + t), shape: 'rect_hss',
      A, Ix, Iy, Sx: 2 * Ix / H, Sy: 2 * Iy / B,
      Zx: B * H * H / 4 - bi * hi * hi / 4, Zy: H * B * B / 4 - hi * bi * bi / 4,
      Av: 2 * H * t, h: H, b: B, closed: true, note: '' });
  }

  function flatBar(H, B, name) {
    const A = B * H;
    return props({ name: name || ('FLAT ' + H + 'x' + B), shape: 'flat_bar',
      A, Ix: B * H ** 3 / 12, Iy: H * B ** 3 / 12,
      Sx: B * H * H / 6, Sy: H * B * B / 6,
      Zx: B * H * H / 4, Zy: H * B * B / 4,
      Av: 2 / 3 * A, h: H, b: B, closed: false, note: '' });
  }

  function iBeam(H, B, tw, tf, name) {
    if (tf <= 0 || tw <= 0 || H <= 2 * tf)
      throw new Error('Chữ I: cần H > 2tf, tw > 0, tf > 0.');
    const hw = H - 2 * tf;
    const A = 2 * B * tf + hw * tw;
    const Ix = (B * H ** 3 - (B - tw) * hw ** 3) / 12;
    const Iy = (2 * tf * B ** 3 + hw * tw ** 3) / 12;
    return props({ name: name || ('I ' + H + 'x' + B + 'x' + tw + 'x' + tf),
      shape: 'i_beam', A, Ix, Iy, Sx: 2 * Ix / H, Sy: 2 * Iy / B,
      Zx: B * tf * (H - tf) + tw * hw * hw / 4,
      Zy: tf * B * B / 2 + hw * tw * tw / 4,
      Av: H * tw, h: H, b: B, closed: false, note: '' });
  }

  function channel(H, B, tw, tf, name) {
    if (tf <= 0 || tw <= 0 || H <= 2 * tf || B <= tw)
      throw new Error('Thép U: cần H > 2tf, B > tw, tw > 0, tf > 0.');
    const hi = H - 2 * tf;
    const A = B * H - (B - tw) * hi;
    const Ix = (B * H ** 3 - (B - tw) * hi ** 3) / 12;
    const aWeb = tw * H, xWeb = tw / 2;
    const aFl = 2 * tf * (B - tw), xFl = tw + (B - tw) / 2;
    const xb = (aWeb * xWeb + aFl * xFl) / A;
    const Iy = H * tw ** 3 / 12 + aWeb * (xWeb - xb) ** 2
             + 2 * (tf * (B - tw) ** 3 / 12) + aFl * (xFl - xb) ** 2;
    const Sy = Iy / Math.max(xb, B - xb);
    return props({ name: name || ('C ' + H + 'x' + B + 'x' + tw + 'x' + tf),
      shape: 'channel', A, Ix, Iy, Sx: 2 * Ix / H, Sy,
      Zx: B * H * H / 4 - (B - tw) * hi * hi / 4, Zy: Sy,
      Av: H * tw, h: H, b: B, closed: false,
      note: 'Zy lấy = Sy (an toàn). Tâm cắt lệch khỏi trọng tâm — tránh đặt tải gây xoắn.' });
  }

  function angle(H, B, t, name) {
    if (t <= 0 || H <= t || B <= t)
      throw new Error('Thép góc: cần H > t, B > t, t > 0.');
    const a1 = H * t, a2 = (B - t) * t;
    const A = a1 + a2;
    const xb = (a1 * t / 2 + a2 * (t + (B - t) / 2)) / A;
    const yb = (a1 * H / 2 + a2 * t / 2) / A;
    const Ix = t * H ** 3 / 12 + a1 * (H / 2 - yb) ** 2
             + (B - t) * t ** 3 / 12 + a2 * (t / 2 - yb) ** 2;
    const Iy = H * t ** 3 / 12 + a1 * (t / 2 - xb) ** 2
             + t * (B - t) ** 3 / 12 + a2 * (t + (B - t) / 2 - xb) ** 2;
    const Ixy = a1 * (t / 2 - xb) * (H / 2 - yb)
              + a2 * (t + (B - t) / 2 - xb) * (t / 2 - yb);
    const avg = (Ix + Iy) / 2, dif = (Ix - Iy) / 2;
    const R = Math.hypot(dif, Ixy);
    const o = props({ name: name || ('L ' + H + 'x' + B + 'x' + t), shape: 'angle',
      A, Ix, Iy, Sx: Ix / Math.max(yb, H - yb), Sy: Iy / Math.max(xb, B - xb),
      Zx: Ix / Math.max(yb, H - yb), Zy: Iy / Math.max(xb, B - xb),
      Av: H * t, h: H, b: B, closed: false,
      note: 'Z lấy = S (an toàn). r_min theo trục chính v.' });
    o._IminPrincipal = avg - R;
    return o;
  }

  function tee(H, B, tw, tf, name) {
    if (tf <= 0 || tw <= 0 || H <= tf)
      throw new Error('Chữ T: cần H > tf, tw > 0, tf > 0.');
    const hw = H - tf;
    const aF = B * tf, yF = H - tf / 2;
    const aW = hw * tw, yW = hw / 2;
    const A = aF + aW;
    const yb = (aF * yF + aW * yW) / A;
    const Ix = B * tf ** 3 / 12 + aF * (yF - yb) ** 2
             + tw * hw ** 3 / 12 + aW * (yW - yb) ** 2;
    const Iy = (tf * B ** 3 + hw * tw ** 3) / 12;
    const Sx = Ix / Math.max(yb, H - yb);
    return props({ name: name || ('T ' + H + 'x' + B + 'x' + tw + 'x' + tf),
      shape: 'tee', A, Ix, Iy, Sx, Sy: 2 * Iy / B, Zx: Sx, Zy: 2 * Iy / B,
      Av: hw * tw, h: H, b: B, closed: false, note: 'Z lấy = S (an toàn).' });
  }

  const SHAPES = {
    'Ống tròn (Pipe / CHS)':     { key: 'round_hss',   dims: ['D ngoài', 't'] },
    'Hộp vuông–CN (SHS / RHS)':  { key: 'rect_hss',    dims: ['H', 'B', 't'] },
    'Chữ I / H':                 { key: 'i_beam',      dims: ['H', 'B', 'tw', 'tf'] },
    'Thép U / C':                { key: 'channel',     dims: ['H', 'B', 'tw', 'tf'] },
    'Thép góc L':                { key: 'angle',       dims: ['H', 'B', 't'] },
    'Chữ T':                     { key: 'tee',         dims: ['H', 'B', 'tw', 'tf'] },
    'Thép bản / thanh đặc':      { key: 'flat_bar',    dims: ['H', 'B'] },
    'Tròn đặc':                  { key: 'solid_round', dims: ['D'] }
  };

  const BUILDERS = {
    round_hss: roundHSS, rect_hss: rectHSS, i_beam: iBeam, channel: channel,
    angle: angle, tee: tee, flat_bar: flatBar, solid_round: solidRound
  };

  function build(shape, dims, name) {
    const fn = BUILDERS[shape];
    if (!fn) throw new Error('Không biết dạng tiết diện: ' + shape);
    const sp = fn.apply(null, dims.concat([name]));
    sp._dims = dims.slice();      // giữ lại để lưu/nạp thư viện
    return sp;
  }

  function rMinEffective(sp) {
    if (sp._IminPrincipal !== undefined && sp.A > 0) {
      return Math.sqrt(Math.max(sp._IminPrincipal, 1e-12) / sp.A);
    }
    return sp.rmin;
  }

  const DEFAULT_DIMS = {
    round_hss: [114.3, 6], rect_hss: [100, 100, 5], i_beam: [150, 150, 7, 10],
    channel: [100, 50, 5, 6], angle: [75, 75, 6], tee: [100, 100, 6, 8],
    flat_bar: [100, 10], solid_round: [40]
  };

  const PRESETS = {
    'Thép góc L (đều cạnh)': [
      ['L40x40x4', 'angle', [40, 40, 4]], ['L50x50x5', 'angle', [50, 50, 5]],
      ['L63x63x6', 'angle', [63, 63, 6]], ['L70x70x7', 'angle', [70, 70, 7]],
      ['L75x75x6', 'angle', [75, 75, 6]], ['L80x80x8', 'angle', [80, 80, 8]],
      ['L100x100x10', 'angle', [100, 100, 10]], ['L120x120x12', 'angle', [120, 120, 12]]
    ],
    'Hộp vuông SHS': [
      ['SHS 40x40x3', 'rect_hss', [40, 40, 3]], ['SHS 50x50x4', 'rect_hss', [50, 50, 4]],
      ['SHS 60x60x4', 'rect_hss', [60, 60, 4]], ['SHS 75x75x5', 'rect_hss', [75, 75, 5]],
      ['SHS 100x100x5', 'rect_hss', [100, 100, 5]], ['SHS 100x100x6', 'rect_hss', [100, 100, 6]],
      ['SHS 125x125x6', 'rect_hss', [125, 125, 6]], ['SHS 150x150x8', 'rect_hss', [150, 150, 8]]
    ],
    'Hộp chữ nhật RHS': [
      ['RHS 80x40x3', 'rect_hss', [80, 40, 3]], ['RHS 100x50x4', 'rect_hss', [100, 50, 4]],
      ['RHS 120x60x4', 'rect_hss', [120, 60, 4]], ['RHS 150x100x5', 'rect_hss', [150, 100, 5]],
      ['RHS 200x100x6', 'rect_hss', [200, 100, 6]]
    ],
    'Thép U / C': [
      ['C80x40x4x6', 'channel', [80, 40, 4, 6]], ['C100x50x5x6', 'channel', [100, 50, 5, 6]],
      ['C120x55x6x7', 'channel', [120, 55, 6, 7]], ['C150x75x6x9', 'channel', [150, 75, 6, 9]],
      ['C200x80x7x11', 'channel', [200, 80, 7, 11]]
    ],
    'Chữ I / H': [
      ['I100x55x4.5x7', 'i_beam', [100, 55, 4.5, 7]],
      ['I150x75x5x9', 'i_beam', [150, 75, 5, 9]],
      ['I200x100x5.5x8', 'i_beam', [200, 100, 5.5, 8]],
      ['H100x100x6x8', 'i_beam', [100, 100, 6, 8]],
      ['H150x150x7x10', 'i_beam', [150, 150, 7, 10]],
      ['H200x200x8x12', 'i_beam', [200, 200, 8, 12]]
    ],
    'Ống tròn': [
      ['PIPE 48.3x3.7', 'round_hss', [48.3, 3.7]], ['PIPE 60.3x3.9', 'round_hss', [60.3, 3.9]],
      ['PIPE 88.9x5.5', 'round_hss', [88.9, 5.5]], ['PIPE 114.3x6.0', 'round_hss', [114.3, 6.0]],
      ['PIPE 168.3x7.1', 'round_hss', [168.3, 7.1]]
    ],
    'Thép bản': [
      ['FB 100x10', 'flat_bar', [100, 10]], ['FB 150x12', 'flat_bar', [150, 12]],
      ['FB 200x16', 'flat_bar', [200, 16]]
    ]
  };

  const PRESET_WARNING =
    'Kích thước preset là kích thước DANH NGHĨA thường gặp, dùng để điền nhanh. ' +
    'Trước khi phát hành thiết kế phải đối chiếu catalogue nhà sản xuất / tiêu ' +
    'chuẩn áp dụng (JIS G3192, EN 10056, EN 10219, ASTM A500, TCVN 1656…).';

  root.PSAT.sections = { build, rMinEffective, SHAPES, PRESETS, PRESET_WARNING,
                         DEFAULT_DIMS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
