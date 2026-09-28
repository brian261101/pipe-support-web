# Pipe Support Analysis — bản web

Công cụ tính **giá đỡ (support) đường ống** bằng **phần tử hữu hạn khung phẳng**,
chạy **hoàn toàn trong trình duyệt**. Không cần cài gì, không cần máy chủ, không
có dữ liệu nào rời khỏi máy bạn.

**👉 Dùng ngay: https://brian261101.github.io/pipe-support-web/**

Bản ứng dụng Windows (Python/Tkinter, kèm file `.exe`) nằm ở repo riêng:
[pipe-support-tool](https://github.com/brian261101/pipe-support-tool).

> ⚠️ Đây là công cụ **sàng lọc và định cỡ sơ bộ**. Hồ sơ thiết kế phát hành phải
> được kỹ sư có thẩm quyền kiểm tra độc lập. Xem mục *Giới hạn*.

---

## Dùng offline

Trang này không gọi máy chủ nào, nên tải về là chạy được:

```bash
git clone https://github.com/brian261101/pipe-support-web.git
```

rồi mở `index.html` bằng trình duyệt — kể cả khi không có mạng. Các file JS được
nạp bằng thẻ `<script>` thường (không phải ES module) chính là để mở trực tiếp
từ `file://` cũng chạy. Chỉ có phông chữ Google Fonts là lấy từ mạng; mất mạng
thì trang vẫn hoạt động, chỉ đổi phông.

Có thể cài như ứng dụng: trong Chrome/Edge bấm biểu tượng cài đặt trên thanh địa chỉ.

---

## Quy trình dùng

**1 · Ống & môi chất** — tra OD / chiều dày theo NPS + Schedule, chọn vật liệu ống,
môi chất, bảo ôn. Mọi ô sửa tay được. Bấm *Tính tải ống* để ra tải phân bố `w` và
khoảng cách gối đỡ, rồi *→ Dùng làm lực tác dụng* để đưa `N = w × L` sang bài toán khung.

**2 · Tiết diện thép** — chọn dạng và nhập kích thước; đặc trưng được tính từ kích
thước chứ không tra bảng. Thêm nhiều phương án vào thư viện để dùng cho *Tự chọn tiết diện*.

**3 · Khung support** — mỗi dòng một thanh, khai bằng toạ độ hai đầu. **Hai thanh có
toạ độ trùng nhau thì tự động nối với nhau.** Thêm lực (độ lớn + góc) và gối tựa.

**4 · Kết quả** — nội lực, vị trí mặt cắt nguy hiểm, mức sử dụng, hệ số tải cho phép,
và các đề xuất suy từ chính con số tính ra.

**5 · Báo cáo** — toàn bộ đầu vào, nội lực, kiểm tra, kết luận; tải về dạng `.txt`.

Nút **Tự chọn tiết diện** thử lần lượt mọi tiết diện trong thư viện và **giải lại
toàn bộ bài toán PTHH cho từng phương án** (đổi độ cứng sẽ phân bố lại nội lực trong
khung siêu tĩnh), rồi chỉ ra phương án nhẹ nhất còn đạt.

Nút **Tự kiểm chứng** chạy ngay trong trình duyệt bộ bài toán có nghiệm giải tích —
bạn tự xác nhận solver đúng, không phải tin lời README.

Dữ liệu nhập được nhớ lại trong `localStorage` của trình duyệt, đóng tab mở lại vẫn còn.

---

## Phương pháp

### Phần tử hữu hạn
Phần tử dầm–cột **Euler–Bernoulli 2D**, 6 bậc tự do (`u`, `v`, `θ`), nút cứng. Mỗi
thanh vật lý chia thành nhiều phần tử để bắt biến thiên nội lực và dạng mất ổn định.
Có kể trọng lượng bản thân dưới dạng tải phân bố đều với lực ngàm hai đầu.

### Ổn định — bài toán trị riêng
Không đoán `KL/r` cho cả khung. Chương trình lập **ma trận độ cứng hình học** `Kg`
từ chính lực dọc trục vừa giải, rồi giải

```
(K + λ·Kg)·φ = 0
```

`λ_cr` là hệ số tải tới hạn của **toàn khung**. Giải bằng phép lặp luỹ thừa trên
toán tử `L⁻¹(−Kg)L⁻ᵀ` với phân tích Cholesky của `K`, dịch phổ tối thiểu. Cholesky
không phân tích được ⇔ kết cấu thiếu liên kết — chương trình báo đúng nguyên nhân đó.

### Kiểm tra thanh — ứng suất cho phép (ASD)
```
kéo     Ft = 0,6·Fy        uốn   Fb = 0,6·Fy        cắt   Fv = 0,4·Fy
nén     Fa = Fcr / 1,67,  Fcr theo AISC 360 chương E
            Fe = π²E/(KL/r)²
            KL/r ≤ 4,71·√(E/Fy) :  Fcr = 0,658^(Fy/Fe)·Fy
            ngược lại           :  Fcr = 0,877·Fe
tổ hợp  AISC H1-1
```
**Thiên về an toàn** so với AISC 360 đầy đủ: dùng `S` chứ không phải `Z`, không cộng
điểm cho ổn định ngang của dầm.

### Kiểm chứng
Nút *Tự kiểm chứng* so kết quả với nghiệm giải tích:

| Bài toán | Sai số |
|---|---|
| Công xôn + lực tập trung / tải phân bố | < 0,01 % |
| Dầm đơn giản, lực giữa nhịp | < 0,01 % |
| Thanh kéo dọc trục | < 0,01 % |
| Euler: 2 đầu khớp / ngàm–tự do / ngàm–khớp | 0,001 % / 0,000 % / 0,015 % |
| Cân bằng phản lực khung | ~1e-9 N |

Bản JS này cho **kết quả trùng khớp với bản Python** đến từng chữ số trên cùng bài toán.

---

## Cấu trúc

```
index.html
css/app.css
js/linalg.js     đại số tuyến tính (Cholesky, trị riêng) — thuần JS
js/fem.js        phần tử hữu hạn khung phẳng: tĩnh học + ổn định
js/sections.js   đặc trưng hình học tiết diện
js/pipe.js       tải trọng ống, khoảng cách gối đỡ, co giãn nhiệt
js/checks.js     kiểm tra thanh theo ASD
js/analysis.js   điều phối: nhập liệu → mô hình → kiểm tra
js/advice.js     đề xuất kỹ thuật
js/report.js     xuất báo cáo
js/draw.js       vẽ trên <canvas>
js/verify.js     bộ tự kiểm chứng
js/app.js        giao diện
```

Không framework, không bước build, không phụ thuộc gói nào. Đại số tuyến tính và
phần vẽ đều tự viết.

---

## Tiêu chuẩn tham chiếu

| Nhóm | Tiêu chuẩn |
|---|---|
| Đường ống công nghệ LNG | ASME B31.3; EN 1473; NFPA 59A; EN 13480 |
| Tuyến ống dẫn khí | ASME B31.8; API 5L |
| Giá đỡ | MSS SP-58; MSS SP-69; ASME B31.3 §321 |
| Khoảng cách gối đỡ | ASME B31.1 Table 121.5 |
| Thanh thép | AISC 360; EN 1993-1-1 |
| Kích thước ống | ASME B36.10M; B36.19M |

Bảng tra trong `js/data.js` là **dữ liệu tham khảo để điền nhanh**, không thay thế
tiêu chuẩn gốc. Ứng suất cho phép của ống ở nhiệt độ thiết kế phải lấy từ ASME B31.3
Bảng A-1/A-2.

---

## Giới hạn

Mô hình là **khung phẳng 2D, nút cứng**. Không xét: xoắn và tâm cắt lệch của thép U /
thép góc; ổn định ngang của dầm (LTB) và ổn định cục bộ của bản thành; mỏi, tải trọng
động, rung, động đất, gió; liên kết bu-lông và mối hàn; ứng suất do giãn nở nhiệt của
ống truyền vào giá đỡ (chỉ *cảnh báo* độ co ngót, không tính lực).

Tiết diện coi là đặc chắc. Kết quả dùng để sàng lọc phương án và định cỡ sơ bộ.
