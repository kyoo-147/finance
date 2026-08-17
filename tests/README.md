# Kiểm thử và đối soát

Thư mục này độc lập với ứng dụng. Nó không sửa dữ liệu nguồn và không phụ thuộc thư viện test bên ngoài.

## Dữ liệu chuẩn đã đối soát

`fixtures/expected-reconciliation.json` là **nguồn chuẩn kiểm thử**, không phải dữ liệu giả của UI:

- Stripe tháng 07/2026: 23 payout; gross = net = 502,242 cents (AUD 5,022.42); fee = 0.
- Xero payslip: kỳ 20/07/2026-02/08/2026, thanh toán 04/08/2026; gross 72,000 cents; PAYG 12,800 cents; net 59,200 cents; super 8,640 cents.
- ING bank statement: mở kỳ 57,810 cents, đóng kỳ 121,419 cents; biến động ròng 63,609 cents.

Bank statement có giao dịch cá nhân, business, Stripe settlements, transfers và debt repayment. Vì vậy tổng withdrawal **không được** dùng trực tiếp làm business expenses hay profit calculation.

## Chạy API acceptance harness

1. Khởi động ứng dụng local và để API chỉ bind `127.0.0.1`.
2. Đặt URL rồi chạy:

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:4747'
node tests/api-contract.mjs
```

Harness kỳ vọng API có namespace `/api` (thay bằng `$env:API_PREFIX` nếu cần) và tối thiểu:

| Endpoint | Mục đích |
| --- | --- |
| `GET /api/health` | Trả `{ ok: true }` hoặc `{ status: "ok" }` |
| `POST /api/imports` | Nhận multipart `source` và `file`; trả import id + summary |

Khi backend API ổn định, cập nhật adapter endpoint trong harness thay vì sửa số liệu chuẩn.

## Ma trận E2E bắt buộc trước bàn giao

| Nhóm | Case | Kết quả phải đúng |
| --- | --- | --- |
| Startup | Mở shortcut | Browser mở local URL; service chỉ listen 127.0.0.1 |
| Stripe | Upload file thật tháng 07/2026 | 23 records, gross/net AUD 5,022.42, zero fees, AUD, 23 payout IDs duy nhất |
| Stripe | Upload lại cùng file | Không có record mới; báo duplicate/idempotent rõ ràng |
| Stripe | Amount không hợp lệ | Fail toàn bộ import, không partial commit |
| Stripe | Currency USD fixture | Require explicit reject hoặc review; không cộng vào AUD dashboard im lặng |
| Xero | Upload payslip nguồn | Payment date 04/08/2026; gross/PAYG/net/super khớp fixture; `gross - PAYG = net` |
| Bank | Upload statement nguồn | Nhận diện period và opening/closing balances; `opening + deposits - withdrawals = closing` |
| Bank | Rule categorisation | `STRIPE`/internal transfer/debt repayment phải excluded khỏi business expense mặc định; unknown phải `needs_review` |
| Transactions | Sửa category/scope | Dashboard và allocation phản ánh đúng; audit event được tạo |
| Allocation | 7 quỹ mặc định | Tổng đúng 10,000 bps; không cho save nếu khác 100% |
| Money | Các phép tính | Lưu và trả integer cents; không float/rounding drift |
| Restart | Tắt/mở local server | SQLite giữ nguyên data, import hash, rule và audit log |
| Offline | Không có Internet | Import, dashboard và lịch sử vẫn hoạt động |
| Security | Cổng local | Không bind `0.0.0.0`; không gửi source file/PII ra ngoài |

## Tiêu chí nghiệm thu tài chính

1. Các mutation import phải atomic: thành công toàn bộ hoặc không ghi gì.
2. Duplicate file hash và duplicate business key (provider transaction/payout id) đều phải được chặn.
3. Tiền chỉ dùng integer minor units trong DB/API; UI mới format sang AUD.
4. Xero superannuation là employer contribution, không được cộng vào cash net pay.
5. Stripe payout là cash settlement; không được double-count nếu cùng settlement xuất hiện trong bank statement.
6. Business classification là quyết định có thể review/audit, không suy diễn chắc chắn từ một merchant unknown.

## Browser E2E authoritative runner

```text
npm run browser:e2e
```

Runner uses Chrome/CDP and an isolated SQLite database. It covers transactions, rules, allocation, holdings, settings, backup/restore, restart persistence, degraded/error states and screenshots. The consolidated result is maintained only in `QA-ACCEPTANCE-REPORT.md`.
