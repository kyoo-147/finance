# Jerri Finance — Danh sách chức năng sản phẩm

## 1. Phạm vi sản phẩm

Jerri Finance là ứng dụng desktop local-first cho việc nhập, kiểm tra, phân loại, tính toán và giải thích dữ liệu tài chính.

Nguyên tắc cốt lõi:

1. Dữ liệu nguồn phải giữ provenance.
2. Phép tính tiền phải deterministic.
3. Import lỗi phải fail-closed, không ghi dữ liệu một phần.
4. AI chỉ giải thích, không làm kế toán thay hệ thống.
5. Dữ liệu local mặc định không rời khỏi máy.

---

## 2. Bản đồ chức năng

| Khu vực | Chức năng chính | Nguồn dữ liệu |
|---|---|---|
| Dashboard | Tổng quan dòng tiền, lợi nhuận, tài sản | FinanceStore |
| Transactions | Sổ giao dịch, filter, review, CRUD manual | FinanceStore |
| Insights | So sánh tháng, category, anomaly | Deterministic backend |
| Goals | Mục tiêu, progress, deadline, pace | Goals table |
| Ask Jerri | Conversation, model local, chat | FinanceStore context + llama.cpp |
| Settings | Allocation, categories, snapshots, backup | SQLite workspace |

---

## 3. Dashboard

### Inputs

- Transactions đã import hoặc tạo manual.
- Allocation profiles.
- Financial snapshots.

### Outputs

- Cash in.
- Cash out.
- Business profit.
- Cash remaining.
- Income mix.
- Expense ranking.
- Cash flow trend.
- Net worth snapshot.

### Logic quan trọng

- Transfer không được tính hai lần vào cash flow.
- Giao dịch needs_review không tự động được đưa vào business profit.
- Business profit chỉ nhận loại/scope hợp lệ.
- All-time mode tổng hợp tất cả tháng thay vì chỉ tháng mới nhất.

---

## 4. Import system

### Supported input

- Stripe Itemised Payouts CSV.
- Xero payslip PDF.
- ING Orange Everyday statement PDF.
- Manual transaction.

### Import lifecycle

```text
Choose files
  -> Parse
  -> Validate
  -> Match/reconcile
  -> Preview
  -> User confirms
  -> Atomic database transaction
```

### Đảm bảo an toàn

- Duplicate file detection.
- Duplicate source identity detection.
- Matching counterpart validation.
- Atomic rollback khi bất kỳ record nào invalid.
- Undo import.
- Imported source fields được bảo vệ.
- Unknown PDF layout bị từ chối.

---

## 5. Transaction system

### Transaction kinds

- `income`
- `expense`
- `transfer`
- `unknown`

### Transaction scopes

- `business_pt`
- `business_affiliate`
- `employment`
- `personal`
- `unknown`

### Review states

- `confirmed`
- `needs_review`

### CRUD rules

- Manual transaction: create, update, delete.
- Imported transaction: không sửa source facts trực tiếp.
- Match transfer: không reclassify tùy ý.
- Amount phải là safe integer cents.
- Income dương, expense âm.
- Date phải là calendar date hợp lệ.

---

## 6. Deterministic Insights

Insights không gửi phép tính cho AI.

### Metrics

- Current cash in/out.
- Previous-month values.
- Absolute delta.
- Percentage change.
- Top expense categories.
- Review count.
- Unknown classification count.
- Category spike.
- Large expense.

### Contexts

- Monthly.
- All time.
- Empty month.
- Month without comparison.

### Contract

Mọi metric hiển thị trên UI phải lấy từ backend `FinanceStore.insights()` hoặc API tương đương, không tính lại bằng UI hoặc model AI.

---

## 7. Goals

### Data

- ID.
- Title.
- Target cents.
- Current cents.
- Deadline.
- Category.
- Created/updated timestamps.

### Derived values

- Progress percentage.
- Remaining cents.
- Status.
- Days remaining.
- Suggested monthly pace.

### Status rules

```text
current >= target       -> complete
current < target and deadline < today -> overdue
otherwise               -> active
```

### CRUD

- Create goal.
- Edit goal.
- Add progress.
- Delete goal.
- Preserve goals in backup/restore.

Goal không tạo hoặc sửa transaction tự động.

---

## 8. Ask Jerri architecture

```text
Renderer chat
   -> preload IPC
      -> main process
         -> FinanceStore.aiContext()
            -> deterministic dashboard/insights/goals/transactions
               -> read-only prompt context
                  -> local llama.cpp server
```

### Backend context

`aiContext()` cung cấp:

- Dashboard summary.
- Insights.
- Goals.
- Bounded transaction facts.
- Timestamp và tháng hiện tại.

### Không được phép

AI không có quyền:

- Tạo transaction.
- Sửa transaction.
- Xóa transaction.
- Tạo/sửa/xóa goal.
- Sửa allocation.
- Sửa category.
- Restore backup.

### Conversation system

- Nhiều conversation session.
- Sort theo `updatedAt`.
- Group Today/Yesterday/Previous 7 days/Older.
- Local persistence.
- Create/select/delete.
- Không gửi conversation lên cloud.

---

## 9. Local model management

### Catalog hiện tại

| Model | Mục đích | Dung lượng tương đối |
|---|---|---:|
| Gemma 3 1B | Máy nhẹ, setup nhanh | ~806 MB |
| Qwen2.5 3B | Cân bằng | ~2.1 GB |
| Phi-4 Mini | Câu trả lời chi tiết hơn | ~2.49 GB |

### Model lifecycle

```text
Not installed
  -> User selects
  -> Consent
  -> Download runtime/model
  -> SHA-256 verify
  -> Extract runtime
  -> Mark installed
  -> Select/use
  -> Remove model
```

### Quy tắc

- Không tự động download.
- Runtime archive phải được hash verify.
- Windows ZIP dùng PowerShell `Expand-Archive`.
- Model xóa riêng, runtime giữ lại.
- Không xóa model đang được server sử dụng.
- Model catalog URL/hash/license không cho sửa tùy ý trong UI.

---

## 10. Settings và persistence

### Allocation

- Effective month.
- Tổng 100%.
- Values 0–100.
- Không làm thay đổi lịch sử tháng cũ.

### Custom categories

- Tối đa 80 ký tự.
- Không trùng built-in.
- Không xóa category đang được transaction dùng.

### Snapshots

- Assets.
- Liabilities.
- Note.
- Exact month.

### Backup

Backup bao gồm:

- Settings.
- Goals.
- Rules.
- Imports.
- Transactions.
- Allocation profiles.
- Snapshots.
- Audit state.

Restore phải validate schema và semantic integrity trước khi thay thế live workspace.

---

## 11. Security boundaries

- `contextIsolation: true`.
- `nodeIntegration: false`.
- Renderer không có `require`/`process`.
- IPC kiểm tra trusted renderer URL.
- Navigation ngoài bị chặn.
- Popup bị chặn.
- Permissions mặc định bị từ chối.
- AI context read-only.
- Download checksum mismatch bị xóa và không activate.

---

## 12. Use-case acceptance matrix

| Use case | Kết quả mong đợi |
|---|---|
| Mở workspace rỗng | Hiện empty state, không crash |
| Import file hợp lệ | Preview rồi atomic commit |
| Import file hỏng | Error visible, database không đổi |
| Import duplicate | Không nhân đôi transaction |
| Undo import | Chỉ undo đúng batch |
| Tạo manual transaction | Record xuất hiện trong ledger |
| Xóa imported transaction | Bị bảo vệ hoặc yêu cầu undo |
| Chọn tháng rỗng | Hiện empty state đúng |
| Chọn All time | Tổng hợp toàn bộ tháng |
| Tạo goal | Goal card xuất hiện |
| Add goal progress | Progress và pace cập nhật |
| Backup | File backup được tạo |
| Restore invalid file | Từ chối, data hiện tại giữ nguyên |
| Tạo conversation | Session mới xuất hiện |
| Xóa conversation | Session biến mất, app chọn session kế tiếp |
| Chọn model chưa cài | Mở setup, chưa download tự động |
| Xóa model đã cài | Xóa file model, runtime giữ lại |
| Hỏi khi chưa setup AI | Hiện setup boundary rõ ràng |
| Hỏi khi model ready | Prompt nhận context deterministic read-only |

---

## 13. Verification boundary

Đã verified trong môi trường Windows hiện tại:

- Node/domain tests: 51/51.
- Source Electron E2E: 12/12.
- Packaged Windows E2E: 12/12.
- Accessibility suite: 0 violations.
- Full-system E2E dùng data tạm mới từ đầu.

Chưa được suy ra từ các kết quả trên:

- macOS Intel physical acceptance.
- macOS Apple Silicon physical acceptance.
- DMG signing/notarization.
- Chất lượng ngôn ngữ hoặc độ chính xác suy luận của từng model trên dữ liệu thật.
- Hiệu năng inference trên mọi cấu hình phần cứng.
