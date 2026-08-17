# QA nghiệm thu — Jerri Finance Portal

**Ngày rà soát:** 2026-08-15

## Kết luận hiện tại

Core backend, FE/BE round-trip chính và browser acceptance runner đã được sửa và pass trên môi trường hiện tại. **Chưa ký nghiệm thu cuối cùng** vì vẫn còn một số capability chưa hoàn chỉnh: endpoint contract coverage, mobile/native startup và các UI phụ trợ.

## Validation

```text
npm run lint         -> PASS
npm run server:test  -> 21 passed, 0 failed
npm run build        -> PASS
npm run browser:e2e  -> PASS trên DB cô lập
```

## Đã sửa trong vòng này

- Asset/liability schema lưu `category`; bootstrap và update giữ đúng category sau refresh/restart.
- Import jobs lưu và trả `duplicate_rows`.
- `needs_review` transaction giữ `scope: unknown`, không bị giả thành personal.
- Overview Tax Reserve lấy tỷ lệ Tax từ allocation rules thay vì hard-code 25%.
- Overview/Cash Flow chỉ dùng liquid assets cho cash balance.
- Cash Flow lọc business/in-profit và tạo các tháng forecast thực tế theo lựa chọn 3M/6M/12M.
- Passive income dùng `returnMtdMinor`, không dùng portfolio value.
- FE mutations propagate lỗi; form/save flows không còn tự coi request thất bại là thành công.
- Category-rule update đã nối từ Settings UI → client → Express → SQLite.
- Re-run category rules chạy atomic và tạo audit event `rule_applied` cho từng transaction thay đổi.
- Thêm regression tests cho asset/liability category round-trip và unknown scope.
- Browser runner kiểm tra category round-trip, transactions/rules/allocation/holdings/settings, backup/restore, restart, degraded/error screenshots.
- QA logs cũ chỉ còn compatibility pointers; file này là nguồn acceptance duy nhất.

## Còn mở trước nghiệm thu cuối

### P1

1. **Chưa có browser evidence riêng cho re-run semantics** dù backend atomic/audited đã được sửa.
2. **Endpoint contract suite còn hẹp.** `tests/api-contract.mjs` mới kiểm tra health, Stripe import, duplicate, invalid import và allocation shape; chưa cover toàn bộ mutation routes.
3. **Error UX chưa đồng nhất ở các thao tác fire-and-forget**, đặc biệt toggle source/rerun settings; global error banner có nhưng thiếu inline pending/error state.

### P2 / boundary

4. Browser runner chưa cover đầy đủ Global Search, Notification Drawer, AI assistant refresh, CSV download, mobile matrix hiện tại và launcher `.cmd`.
5. AI assistant là local deterministic explanation, không phải AI backend/financial adviser.
6. Native Windows launcher/shortcut/manual startup proof nằm ngoài CDP runner.
7. Cloud sync, bank OAuth/live feeds và online account ngoài phạm vi local-only V1.

## Evidence

- Server tests: `server/*.test.mjs`
- Browser runner: `scripts/browser-e2e.mjs`
- Screenshots: `tests/artifacts/ui-e2e/`
- FE/BE adapter: `src/api/client.ts`, `src/context/FinanceContext.tsx`

Không được gọi sản phẩm “hoàn chỉnh 100%” cho đến khi P1 được đóng và browser/mobile/native boundaries được phân loại rõ bằng evidence mới.

Browser screenshots are generated under `tests/artifacts/ui-e2e/` locally and intentionally ignored from GitHub because they can contain financial fixture data.
