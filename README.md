# Jerri Finance Portal

Ứng dụng quản lý tài chính cá nhân chạy hoàn toàn trên máy tính. Web chỉ lắng nghe tại `http://127.0.0.1:4747`; không có cloud account, API key, hay upload dữ liệu tới Internet.

## Cài đặt và mở ứng dụng

Yêu cầu Node.js 24 hoặc mới hơn.

1. Mở Terminal tại thư mục dự án và chạy `npm install`.
2. Chạy `npm run build`.
3. Nhấp đúp **Start Jerri Finance Portal.cmd**.

Launcher tự kiểm tra dependency, production build và local health endpoint trước khi mở browser. Nếu portal đang chạy, launcher chỉ mở tab mới. Giữ cửa sổ server mở trong lúc sử dụng; đóng cửa sổ đó để dừng portal.

## Nguồn import

- Stripe: Itemised Payouts CSV.
- Xero: CSV hoặc payslip PDF text-based theo layout mẫu.
- ING: CSV hoặc Orange Everyday statement PDF text-based theo layout mẫu.

PDF chỉ được chấp nhận khi đọc được các trường bắt buộc và đối soát chính xác. PDF scan, password-protected, hỏng, layout lạ hoặc không đối soát sẽ bị từ chối an toàn trước khi ghi transaction. Bank transaction luôn review-first; Stripe settlement và transfer không tự cộng vào business profit.

## Sao lưu và khôi phục

Trong **Settings → Local Data**, chọn **Download backup**. File `.json` chứa database SQLite cùng manifest SHA-256. Lưu file này ở ổ đĩa khác hoặc backup drive.

Để khôi phục, chọn **Choose backup**. Portal xác minh format, checksum, kích thước, SQLite integrity và các bảng bắt buộc trước khi thay dữ liệu hiện tại. Khôi phục là thao tác thay thế toàn bộ dữ liệu local; hãy export backup mới trước khi thực hiện.

Database hoạt động nằm tại `data/jerri-finance.sqlite`. Mọi giá tiền lưu integer cents; không dùng float cho các số tiền trong database/API. Bảo vệ máy bằng Windows account và BitLocker khi có thể; SQLite không được mã hóa ở tầng database trong V1.

## Kiểm thử

- `npm run lint` — type-check frontend.
- `npm run build` — production build.
- `npm run server:test` — regression test cho import PDF/CSV, financial integrity, SQLite atomicity, backup/restore và persistence.
- `npm run browser:e2e` — full Chrome/CDP acceptance trên database cô lập. Cần Chrome chạy với remote debugging `:9222`; runner tự khởi động local server và ghi screenshot vào `tests/artifacts/ui-e2e/`.

