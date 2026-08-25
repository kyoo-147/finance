# Jerri Finance — Hướng dẫn sử dụng

> Tài liệu hướng dẫn người dùng. Có thể dùng nội dung này để dàn trang lại thành Word/PDF.

## 1. Jerri Finance là gì?

Jerri Finance là ứng dụng desktop quản lý tài chính cá nhân và công việc, ưu tiên lưu trữ cục bộ trên máy tính.

Ứng dụng hỗ trợ:

- Nhập dữ liệu Stripe, Xero và ING.
- Kiểm tra dữ liệu trước khi ghi vào sổ cái.
- Theo dõi dòng tiền, chi phí và lợi nhuận.
- Quản lý giao dịch và phân loại thủ công.
- Xem Insights deterministic.
- Theo dõi Goals.
- Hỏi Ask Jerri bằng model AI local tùy chọn.
- Backup/restore dữ liệu.

Jerri không tự động sửa dữ liệu tài chính. AI chỉ có vai trò giải thích dữ liệu đã được hệ thống tính toán.

---

## 2. Bắt đầu sử dụng

### 2.1 Mở ứng dụng

Mở file:

```text
Jerri Finance.exe
```

Khi ứng dụng khởi động, Jerri mở workspace local. Nếu workspace có dữ liệu, Dashboard sẽ hiển thị ngay. Nếu chưa có dữ liệu, màn hình hướng dẫn nhập file sẽ xuất hiện.

### 2.2 Nhập dữ liệu lần đầu

1. Vào **Dashboard**.
2. Chọn **Add files**.
3. Chọn một hoặc nhiều file CSV/PDF.
4. Đợi Jerri phân tích và hiển thị màn hình preview.
5. Kiểm tra:
   - Tên file.
   - Nguồn dữ liệu.
   - Số giao dịch.
   - Số giao dịch cần review.
   - Các khoản matching/transfer.
6. Chọn **Confirm import** nếu mọi thứ đúng.

Nếu file không đúng layout hoặc dữ liệu không an toàn, Jerri sẽ từ chối import và không thay đổi workspace.

### 2.3 Import nhiều tháng

Có thể import từng tháng hoặc nhiều tháng liên tiếp. Sau khi import, dùng month picker để xem riêng từng tháng hoặc chọn **All time** để xem tổng hợp.

---

## 3. Dashboard

Dashboard là màn hình tổng quan chính.

### Các chỉ số chính

- **Total cash in**: tổng tiền vào, không tính transfer.
- **Total cash out**: tổng tiền ra, không tính transfer.
- **Business profit**: lợi nhuận business sau các rule hợp lệ.
- **Cash remaining**: tiền vào trừ tiền ra.

### Các khu vực

- **Income mix**: tiền đến từ nguồn nào.
- **Profit plan**: cách phân bổ lợi nhuận theo allocation profile.
- **Largest expense categories**: nhóm chi phí lớn nhất.
- **Financial position**: snapshot về tài sản và công nợ.
- **Cash flow**: dòng tiền theo thời gian.

Bấm vào một summary card hoặc biểu đồ để mở Transactions với bộ lọc tương ứng.

### Month picker

Month picker có 3 trạng thái:

- Nền trắng: tháng chưa có dữ liệu.
- Nền sage: tháng đã có dữ liệu.
- Nền đậm: tháng hiện đang chọn.

---

## 4. Transactions

Transactions là sổ giao dịch chi tiết.

### Tìm kiếm và lọc

Có thể lọc theo:

- Từ khóa mô tả.
- Tháng.
- Loại: income, expense, transfer, unknown.
- Scope.
- Category.
- Needs review.
- Cash in/cash out.
- Business profit.

### Review giao dịch

Giao dịch chưa chắc chắn được đánh dấu **Needs review**.

1. Mở Transactions.
2. Chọn từng giao dịch hoặc **Select all**.
3. Kiểm tra category/scope/type.
4. Chọn **Mark reviewed**.

Giao dịch chưa review không được tự động đưa vào business profit nếu không thỏa điều kiện an toàn.

### Tạo giao dịch thủ công

1. Chọn **Add manually**.
2. Nhập ngày, mô tả và số tiền.
3. Chọn loại giao dịch.
4. Chọn scope và category.
5. Chọn Include in business profit nếu phù hợp.
6. Chọn **Save transaction**.

Quy tắc số tiền:

- Income phải là số dương.
- Expense phải là số âm.
- Transfer không được tính là cash in/cash out.
- Số tiền dùng AUD cents, tối đa 2 chữ số thập phân trong giao diện.

### Sửa/xóa

- Giao dịch manual có thể sửa hoặc xóa.
- Dữ liệu nguồn từ import được bảo vệ để giữ nguyên provenance.
- Muốn thay đổi dữ liệu imported, cần undo import trước.

---

## 5. Insights

Insights là phần phân tích deterministic, không dùng AI để tính toán.

Insights hiển thị:

- Cash in hiện tại.
- Cash out hiện tại.
- So sánh với tháng trước.
- Top expense categories.
- Số giao dịch cần review.
- Số giao dịch chưa phân loại.
- Category tăng bất thường.
- Expense lớn cần chú ý.
- All-time aggregation.

Các con số trong Insights lấy từ FinanceStore và dùng cùng logic với Dashboard.

Insights không phải tư vấn đầu tư, thuế hoặc pháp lý.

---

## 6. Goals

Goals giúp theo dõi một mục tiêu tài chính cụ thể.

### Tạo goal

Nhập:

- Goal name.
- Target amount.
- Already saved.
- Deadline.
- Category.

Chọn **Create goal**.

### Thông tin trên goal card

- Trạng thái: active, complete hoặc overdue.
- Phần trăm hoàn thành.
- Số tiền đã tiết kiệm.
- Số tiền còn thiếu.
- Số ngày còn lại.
- Suggested monthly pace.
- Category.

Suggested monthly pace được tính deterministic từ số tiền còn thiếu và thời gian còn lại; đây không phải cam kết tài chính.

### Cập nhật goal

- Chọn **Add progress** để cập nhật số tiền đã tiết kiệm.
- Chọn **Edit** để sửa thông tin.
- Chọn **Remove** để xóa goal sau khi xác nhận.

Goals độc lập với transaction logic; việc tạo goal không tự động tạo giao dịch.

---

## 7. Ask Jerri

Ask Jerri là AI local tùy chọn.

### Conversation

- Tạo conversation mới bằng **New chat** hoặc nút `+`.
- Conversation được nhóm theo Today, Yesterday, Previous 7 days và Older.
- Chọn conversation cũ để xem lại.
- Xóa conversation bằng icon thùng rác.
- Conversation được lưu local-only và giữ khi chuyển tab/reload.

### Chat

- Ô nhập mặc định chỉ cao một dòng.
- Nội dung dài sẽ tự mở rộng.
- Enter để gửi.
- Shift + Enter để xuống dòng.
- Nếu chưa setup model, Send sẽ mở màn hình setup thay vì báo lỗi mơ hồ.

### Model manager

Right rail hiển thị:

- Qwen2.5 3B — cân bằng.
- Gemma 3 1B — nhẹ nhất.
- Phi-4 Mini — lớn hơn, phù hợp câu trả lời chi tiết.

Mỗi model có thể:

- Chọn.
- Setup/download sau khi consent.
- Xem trạng thái installed.
- Xóa downloaded model.

Xóa model không xóa runtime llama.cpp. Model đang được sử dụng không được xóa khi local server còn chạy.

### Quyền đọc dữ liệu của AI

Model không truy cập SQLite tùy ý. Ask Jerri nhận một context read-only do backend tạo qua FinanceStore, gồm:

- Dashboard calculations.
- Deterministic Insights.
- Goals.
- Một tập transaction bounded để giải thích.

AI không có API ghi, sửa hoặc xóa transaction, goal, category hay settings.

---

## 8. Settings

### Profit allocation

Thiết lập tỷ lệ phân bổ cho:

- Owner's pay.
- Tax.
- Savings.
- Investments.
- Education.
- Travel.
- Credit card debt.

Tổng tỷ lệ phải bằng đúng 100%.

Allocation có effective month; thay đổi mới không làm sai các tháng cũ.

### Categories

Có thể thêm custom category.

Không thể xóa:

- Built-in category.
- Category đã được transaction sử dụng.

Điều này bảo vệ lịch sử và không làm thay đổi các phép tính tài chính trước đó.

### Financial snapshot

Snapshot lưu các giá trị:

- Savings.
- Investments.
- Super.
- Other assets.
- Credit card.
- Loans.
- Other liabilities.
- Note.

Snapshot không thay thế transaction ledger.

### Backup/restore

- Chọn **Save backup** để tạo bản sao SQLite.
- Chỉ restore file backup hợp lệ.
- Restore thay thế workspace hiện tại sau khi validation.
- Không restore khi chưa chắc chắn vì dữ liệu hiện tại sẽ bị thay thế.

---

## 9. Quyền riêng tư và dữ liệu

- Dữ liệu tài chính được lưu local trong Electron application-data directory.
- Renderer không có quyền Node trực tiếp.
- AI local không gửi dữ liệu lên cloud service.
- Không tự động tải model.
- Download model được kiểm tra SHA-256 trước khi activate.
- Không chia sẻ file backup hoặc database nếu chưa kiểm tra dữ liệu riêng tư bên trong.

---

## 10. Xử lý lỗi thường gặp

### Cửa sổ trắng khi mở

1. Đóng toàn bộ process Jerri Finance cũ.
2. Mở lại file executable mới.
3. Nếu vẫn lỗi, xem error dialog startup.

### Runtime archive không extract được

Trên Windows, Jerri dùng PowerShell `Expand-Archive` cho runtime ZIP. Không tự giải nén thủ công vào thư mục runtime nếu chưa kiểm tra checksum.

### Model chưa sẵn sàng

Ask Jerri chỉ hoạt động khi:

- Runtime đúng OS/CPU đã cài.
- Model đã tải đủ.
- SHA-256 đúng.
- Local server khởi động thành công.

### Import bị từ chối

Kiểm tra:

- Đúng file Stripe/Xero/ING.
- File không bị sửa hoặc hỏng.
- PDF có text layer phù hợp.
- Không dùng layout ngoài supported input.

---

## 11. Giới hạn hiện tại

- Runtime macOS Intel/Apple Silicon cần được acceptance thật trên thiết bị tương ứng.
- Signing/notarization macOS không được suy ra từ Windows test.
- Model download thật và chất lượng câu trả lời phụ thuộc máy, RAM và model đã chọn.
- Accessibility và E2E Windows không thay thế physical acceptance trên macOS.
