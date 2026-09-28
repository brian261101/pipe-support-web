/* Dữ liệu tra cứu: ống, vật liệu, môi chất, bảo ôn, tiêu chuẩn.

   CẢNH BÁO: các bảng dưới đây là DỮ LIỆU THAM KHẢO để điền nhanh. Chúng KHÔNG
   thay thế tiêu chuẩn gốc. Trước khi dùng cho thiết kế phát hành phải đối chiếu
   ASME B36.10M / B36.19M (kích thước ống), ASME B31.3 Bảng A-1/A-2 (ứng suất cho
   phép ở nhiệt độ thiết kế) và catalogue nhà sản xuất. Mọi ô nhập đều cho phép
   ghi đè bằng tay. */
(function (root) {
  'use strict';

  const DISCLAIMER =
    'Dữ liệu tra cứu chỉ để điền nhanh — phải đối chiếu ASME B36.10M/B36.19M, ' +
    'B31.3 Bảng A-1 và catalogue nhà sản xuất trước khi phát hành thiết kế.';

  const STANDARDS = {
    'LNG / NG — nhà máy, công nghệ': [
      ['ASME B31.3', 'Process Piping — bộ tiêu chuẩn đường ống công nghệ phổ biến nhất cho nhà máy LNG'],
      ['EN 1473', 'Installation and equipment for LNG — thiết kế trên bờ'],
      ['NFPA 59A', 'Production, storage and handling of LNG'],
      ['EN 13480', 'Metallic industrial piping (hệ châu Âu)']
    ],
    'NG — tuyến ống dẫn, phân phối': [
      ['ASME B31.8', 'Gas Transmission and Distribution Piping Systems'],
      ['ASME B31.8S', 'Managing System Integrity of Gas Pipelines'],
      ['API 5L', 'Line Pipe']
    ],
    'Giá đỡ / support': [
      ['MSS SP-58', 'Pipe Hangers and Supports — vật liệu, thiết kế, chế tạo'],
      ['MSS SP-69', 'Pipe Hangers and Supports — lựa chọn và ứng dụng'],
      ['ASME B31.3 §321', 'Yêu cầu về giá đỡ trong B31.3'],
      ['ASME B31.1 Table 121.5', 'Khoảng cách gối đỡ gợi ý (cơ sở: σb 15,9 MPa, võng 2,5 mm)'],
      ['AISC 360', 'Specification for Structural Steel Buildings'],
      ['EN 1993-1-1', 'Eurocode 3 — thiết kế kết cấu thép']
    ],
    'Hơi/nước, công dụng chung': [
      ['ASME B31.1', 'Power Piping'],
      ['TCVN 6155/6156', 'Bình chịu áp lực — yêu cầu kỹ thuật an toàn']
    ]
  };

  const PIPE_OD = {
    '1/2': 21.3, '3/4': 26.7, '1': 33.4, '1-1/4': 42.2, '1-1/2': 48.3,
    '2': 60.3, '2-1/2': 73.0, '3': 88.9, '4': 114.3, '5': 141.3,
    '6': 168.3, '8': 219.1, '10': 273.0, '12': 323.8, '14': 355.6,
    '16': 406.4, '18': 457.2, '20': 508.0, '24': 609.6
  };

  const PIPE_DN = {
    '1/2': 'DN15', '3/4': 'DN20', '1': 'DN25', '1-1/4': 'DN32', '1-1/2': 'DN40',
    '2': 'DN50', '2-1/2': 'DN65', '3': 'DN80', '4': 'DN100', '5': 'DN125',
    '6': 'DN150', '8': 'DN200', '10': 'DN250', '12': 'DN300', '14': 'DN350',
    '16': 'DN400', '18': 'DN450', '20': 'DN500', '24': 'DN600'
  };

  const PIPE_WALL = {
    '1/2':   { '10S': 2.11, '40 (STD)': 2.77, '80 (XS)': 3.73, '160': 4.78 },
    '3/4':   { '10S': 2.11, '40 (STD)': 2.87, '80 (XS)': 3.91, '160': 5.56 },
    '1':     { '10S': 2.77, '40 (STD)': 3.38, '80 (XS)': 4.55, '160': 6.35 },
    '1-1/4': { '10S': 2.77, '40 (STD)': 3.56, '80 (XS)': 4.85, '160': 6.35 },
    '1-1/2': { '10S': 2.77, '40 (STD)': 3.68, '80 (XS)': 5.08, '160': 7.14 },
    '2':     { '10S': 2.77, '40 (STD)': 3.91, '80 (XS)': 5.54, '160': 8.74 },
    '2-1/2': { '10S': 3.05, '40 (STD)': 5.16, '80 (XS)': 7.01, '160': 9.53 },
    '3':     { '10S': 3.05, '40 (STD)': 5.49, '80 (XS)': 7.62, '160': 11.13 },
    '4':     { '10S': 3.05, '40 (STD)': 6.02, '80 (XS)': 8.56, '160': 13.49 },
    '5':     { '10S': 3.40, '40 (STD)': 6.55, '80 (XS)': 9.53, '160': 15.88 },
    '6':     { '10S': 3.40, '40 (STD)': 7.11, '80 (XS)': 10.97, '160': 18.26 },
    '8':     { '10S': 3.76, '40 (STD)': 8.18, '80 (XS)': 12.70, '160': 23.01 },
    '10':    { '10S': 4.19, '40 (STD)': 9.27, '80 (XS)': 15.09, '160': 28.58 },
    '12':    { '10S': 4.57, 'STD': 9.53, '40': 10.31, 'XS': 12.70, '80': 17.48 },
    '14':    { '10S': 4.78, 'STD': 9.53, '40': 11.13, 'XS': 12.70, '80': 19.05 },
    '16':    { '10S': 4.78, 'STD': 9.53, '40': 12.70, 'XS': 12.70, '80': 21.44 },
    '18':    { '10S': 4.78, 'STD': 9.53, '40': 14.27, 'XS': 12.70, '80': 23.83 },
    '20':    { '10S': 5.54, 'STD': 9.53, '40': 15.09, 'XS': 12.70, '80': 26.19 },
    '24':    { '10S': 6.35, 'STD': 9.53, '40': 17.48, 'XS': 12.70, '80': 30.96 }
  };

  /* [ρ kg/m³, E MPa, ghi chú] */
  const PIPE_MATERIALS = {
    'A106 Gr.B (thép carbon)': [7850, 203000,
      'Đường ống công nghệ thông thường. KHÔNG dùng cho nhiệt độ âm sâu (giới hạn thường −29 °C) — không phù hợp LNG.'],
    'A333 Gr.6 (thép nhiệt độ thấp)': [7850, 203000,
      'Thép chịu lạnh, thường dùng đến −45 °C. Dùng cho NG lạnh, KHÔNG đủ cho LNG −162 °C.'],
    'A333 Gr.3 (3,5% Ni)': [7850, 203000,
      'Đến khoảng −101 °C. Vẫn chưa đủ cho LNG −162 °C.'],
    'A333 Gr.8 / A353 (9% Ni)': [7850, 200000,
      '9% Ni — vật liệu kinh điển cho LNG đến −196 °C.'],
    'A312 TP304 / 304L (inox austenit)': [8000, 193000,
      'Austenit — dùng tốt đến −196 °C. Lựa chọn phổ biến cho ống LNG.'],
    'A312 TP316 / 316L (inox austenit)': [8000, 193000,
      'Như 304 nhưng chống ăn mòn tốt hơn (môi trường biển).'],
    'API 5L X52 (tuyến ống)': [7850, 207000, 'Tuyến ống dẫn khí. Theo ASME B31.8.'],
    'API 5L X60 / X65 (tuyến ống)': [7850, 207000, 'Tuyến ống dẫn khí áp suất cao.'],
    'Nhôm 5083': [2660, 71000,
      'Nhôm hợp kim — dùng được đến −196 °C, nhẹ, nhưng E chỉ bằng 1/3 thép nên độ võng lớn hơn nhiều.']
  };

  /* [ρ kg/m³, ghi chú] */
  const FLUIDS = {
    'LNG (lỏng, −162 °C)':      [450, 'Thường 430–470 tuỳ thành phần.'],
    'NG (khí, áp suất thấp)':   [0.8, 'Gần như không đáng kể so với ống.'],
    'NG (khí, 10 barg)':        [8, 'Ước lượng — nên tính lại theo P, T thực tế.'],
    'NG (khí, 50 barg)':        [40, 'Ước lượng — nên tính lại theo P, T thực tế.'],
    'Nước (thuỷ lực / test)':   [1000, 'Trường hợp THỬ THUỶ LỰC — thường là tổ hợp nặng nhất.'],
    'Dầu nhẹ':                  [850, ''],
    'Không khí / nitơ':         [1.2, ''],
    'Rỗng (không có môi chất)': [0, '']
  };

  const INSULATION = {
    'Không bảo ôn':               [0, ''],
    'PIR / PUR foam':             [45, 'Cách nhiệt lạnh phổ biến.'],
    'Cellular glass (Foamglas)':  [120, 'Dùng nhiều cho cryogenic, chịu nén tốt — thường dùng làm GỐI ĐỠ lạnh.'],
    'Bông khoáng (mineral wool)': [100, 'Cho đường nóng.'],
    'Perlite':                    [60, '']
  };

  /* [Fy, Fu, E, ρ, ghi chú] */
  const SUPPORT_STEEL = {
    'S235 / CT3 / SS400':   [235, 360, 210000, 7850, 'Thép kết cấu thông dụng.'],
    'S275':                 [275, 430, 210000, 7850, ''],
    'S355 / Q345':          [355, 490, 210000, 7850, 'Cường độ cao hơn.'],
    'ASTM A36':             [250, 400, 200000, 7850, 'Hệ Mỹ.'],
    'ASTM A992 (W-shape)':  [345, 450, 200000, 7850, 'Thép hình kết cấu Mỹ.'],
    'ASTM A500 Gr.B (hộp)': [315, 400, 200000, 7850, 'Thép hộp HSS.'],
    'SUS304 (inox)':        [205, 515, 193000, 8000,
      'Dùng khi giá đỡ tiếp xúc trực tiếp môi trường lạnh / ăn mòn.']
  };

  root.PSAT = root.PSAT || {};
  root.PSAT.data = {
    DISCLAIMER, STANDARDS, PIPE_OD, PIPE_DN, PIPE_WALL, PIPE_MATERIALS,
    FLUIDS, INSULATION, SUPPORT_STEEL,
    DEFAULT_FLUID: 'LNG (lỏng, −162 °C)',
    DEFAULT_STEEL: 'S235 / CT3 / SS400',
    GRAVITY: 9.80665,
    schedulesFor: function (nps) { return Object.keys(PIPE_WALL[nps] || {}); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
