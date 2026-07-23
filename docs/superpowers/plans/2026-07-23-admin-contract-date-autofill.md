# Admin Contract Date Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tự điền ngày bắt đầu hôm nay và ngày kết thúc sau 12 tháng, hiển thị/chỉnh sửa `dd/mm/yyyy` trên Web Admin và Expo role Admin.

**Architecture:** Tách toàn bộ parse, format, cộng 12 tháng và validation vào utility TypeScript thuần `utils/contractDate.ts`. Web Admin và Expo dùng chung semantic API nhưng giữ component nhập ngày riêng theo nền tảng; payload chỉ được tạo sau khi ngày được parse nghiêm ngặt thành ISO.

**Tech Stack:** TypeScript, Node test runner, Next.js 16, React Native/Expo 54, `@react-native-community/datetimepicker`.

---

## Cấu trúc file

- Create `utils/contractDate.ts`: utility ngày thuần, không phụ thuộc UI hoặc timezone runtime.
- Create `test_contract_date.js`: test TDD cho parse/format/default/năm nhuận/end-date dirty state.
- Modify `package.json`: đưa test ngày vào `test:ui`.
- Modify `webadmin/src/app/dashboard/contracts/new/contract-wizard-state.ts`: khởi tạo và validate draft dạng hiển thị.
- Modify `webadmin/src/app/dashboard/contracts/new/page.tsx`: input `dd/mm/yyyy`, lịch web, chuyển ISO trước khi gọi API.
- Modify `screens/AdminContractsScreen.tsx`: input `dd/mm/yyyy`, date picker native và payload ISO.
- Modify `package.json` và `package-lock.json`: thêm date picker tương thích Expo.

### Task 1: Utility ngày dùng chung

**Files:**
- Create: `utils/contractDate.ts`
- Create: `test_contract_date.js`
- Modify: `package.json`

- [ ] **Step 1: Viết test RED**

Test phải import utility thông qua TypeScript transpilation hiện có và kiểm tra:

```js
assert.equal(formatIsoToDisplay("2026-07-23"), "23/07/2026");
assert.equal(parseDisplayToIso("23/07/2026"), "2026-07-23");
assert.equal(parseDisplayToIso("31/02/2026"), null);
assert.equal(addTwelveMonths("29/02/2024"), "28/02/2025");
assert.deepEqual(defaultContractDates(new Date("2026-07-23T05:00:00+07:00")), {
  startDate: "23/07/2026",
  endDate: "23/07/2027",
});
assert.equal(resolveEndDateAfterStartChange("24/07/2026", false), "24/07/2027");
assert.equal(resolveEndDateAfterStartChange("24/07/2026", true, "01/08/2027"), "01/08/2027");
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `node --test test_contract_date.js`  
Expected: FAIL vì `utils/contractDate.ts` chưa tồn tại.

- [ ] **Step 3: Cài đặt implementation tối thiểu**

Utility export đúng các hàm:

```ts
export function formatIsoToDisplay(iso: string): string;
export function parseDisplayToIso(value: string): string | null;
export function addTwelveMonths(value: string): string | null;
export function defaultContractDates(now?: Date): { startDate: string; endDate: string };
export function resolveEndDateAfterStartChange(
  startDate: string,
  endDateWasEdited: boolean,
  currentEndDate?: string,
): string;
export function validateContractDateRange(
  startDate: string,
  endDate: string,
): Record<"startDate" | "endDate", string>;
```

Parse bằng tách `dd/mm/yyyy`, tạo ngày UTC từ ba thành phần và đối chiếu ngược ngày/tháng/năm. Không parse trực tiếp chuỗi `dd/mm/yyyy`.

- [ ] **Step 4: Chạy test và xác nhận GREEN**

Run: `node --test test_contract_date.js`  
Expected: toàn bộ test PASS.

- [ ] **Step 5: Gắn vào test suite**

Thêm `test_contract_date.js` vào script `test:ui`, chạy `npm run test:ui`, expected PASS.

### Task 2: Web Admin wizard

**Files:**
- Modify: `webadmin/src/app/dashboard/contracts/new/contract-wizard-state.ts`
- Modify: `webadmin/src/app/dashboard/contracts/new/page.tsx`
- Modify: `test_unified_webadmin_contracts.js`

- [ ] **Step 1: Viết contract test RED**

Kiểm tra source Web Admin có dùng `defaultContractDates`, `parseDisplayToIso`, placeholder `dd/mm/yyyy`, cờ `endDateWasEdited`, và payload `startDate`/`endDate` ISO.

- [ ] **Step 2: Chạy test RED**

Run: `node --test test_unified_webadmin_contracts.js`  
Expected: FAIL vì wizard chưa dùng utility ngày.

- [ ] **Step 3: Khởi tạo draft**

`EMPTY_CONTRACT_DRAFT` không dùng hằng số ngày tại module-load. Tạo hàm:

```ts
export function createContractDraft(now = new Date()): ContractDraft {
  const dates = defaultContractDates(now);
  return { ...EMPTY_CONTRACT_DRAFT, ...dates };
}
```

Khởi tạo state bằng lazy initializer. Khi khôi phục draft, chỉ dùng mặc định nếu hai trường ngày trống.

- [ ] **Step 4: Tạo DateField**

Render input text có `inputMode="numeric"`, placeholder `dd/mm/yyyy`, tự chèn dấu `/` khi gõ và nút lịch. Input lịch ẩn nhận ISO rồi format lại về display. `aria-label` nêu rõ trường ngày.

- [ ] **Step 5: Bảo vệ ngày kết thúc đã sửa**

Thêm `endDateWasEdited` trong state UI. Thay đổi ngày bắt đầu gọi `resolveEndDateAfterStartChange`; thay đổi ngày kết thúc đặt cờ thành `true`.

- [ ] **Step 6: Validate và tạo payload**

`validateContractStep` gọi `validateContractDateRange`. Trong `submit`, parse cả hai ngày; nếu một giá trị `null`, dừng và hiện Notification. Payload:

```ts
{
  ...draft,
  startDate: startDateIso,
  endDate: endDateIso,
}
```

- [ ] **Step 7: Chạy GREEN**

Run: `npm run test:ui && npm --prefix webadmin run lint && npm --prefix webadmin run build`  
Expected: test PASS, lint không lỗi, build PASS.

### Task 3: Expo role Admin

**Files:**
- Modify: `screens/AdminContractsScreen.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test_app_flows.js`

- [ ] **Step 1: Viết contract test RED**

Kiểm tra `AdminContractsScreen` dùng `defaultContractDates`, `parseDisplayToIso`, `DateTimePicker`, placeholder `dd/mm/yyyy` và chỉ gửi ISO qua `adminService.createContract`.

- [ ] **Step 2: Chạy test RED**

Run: `node --test test_app_flows.js`  
Expected: FAIL vì màn hình đang hiển thị `YYYY-MM-DD`.

- [ ] **Step 3: Cài date picker tương thích Expo**

Run: `npx expo install @react-native-community/datetimepicker`  
Expected: dependency được ghi vào package và không có mismatch với Expo SDK 54.

- [ ] **Step 4: Khởi tạo và chỉnh ngày**

Lazy initialize:

```ts
const initialDates = defaultContractDates();
const [startDate, setStartDate] = useState(initialDates.startDate);
const [endDate, setEndDate] = useState(initialDates.endDate);
const [endDateWasEdited, setEndDateWasEdited] = useState(false);
```

Thêm state xác định picker đang mở cho ngày bắt đầu hay kết thúc. Khi chọn ngày native, format về `dd/mm/yyyy`.

- [ ] **Step 5: Render input Admin**

Hai TextInput dùng `keyboardType="number-pad"`, placeholder `dd/mm/yyyy`, có nút `calendar-outline`. Thay đổi ngày bắt đầu chỉ cập nhật ngày kết thúc nếu `endDateWasEdited === false`.

- [ ] **Step 6: Validate và gửi ISO**

Trước `adminService.createContract`, gọi `validateContractDateRange` và `parseDisplayToIso`. Không gọi API nếu lỗi. Payload dùng hai chuỗi ISO.

- [ ] **Step 7: Chạy GREEN**

Run: `node --test test_app_flows.js test_contract_date.js && npx tsc --noEmit`  
Expected: test PASS và TypeScript không lỗi.

### Task 4: Xác minh hồi quy

**Files:**
- Modify: `reports/unified-webadmin-report.md`

- [ ] **Step 1: Chạy toàn bộ test**

Run:

```bash
npm run test:ui
cd backend && npm test
cd ../webadmin && npm run lint && npm run build
cd .. && npx tsc --noEmit
git diff --check
```

Expected: tất cả exit code 0.

- [ ] **Step 2: Kiểm tra ràng buộc nghiệp vụ**

Run:

```bash
node -e 'const fs=require("fs"); const path=require("path"); const banned=new RegExp(["khách","thuê"].join(" "),"i"); for (const file of ["utils/contractDate.ts","screens/AdminContractsScreen.tsx"]) if (banned.test(fs.readFileSync(path.resolve(file),"utf8"))) process.exitCode=1'
rg -n "roomId.*RepairRequest|RepairRequest.*roomId" backend/src
```

Expected: không có thuật ngữ cấm và không tạo liên kết Repair Request qua Phòng.

- [ ] **Step 3: Cập nhật báo cáo**

Ghi vị trí chức năng, quy tắc ngày, kết quả test và xác nhận không push GitHub vào `reports/unified-webadmin-report.md`.

- [ ] **Step 4: Kiểm tra thủ công**

Mở Web Admin và Expo role Admin, xác nhận:

1. Wizard mới hiển thị ngày hôm nay và ngày sau 12 tháng.
2. Cả hai trường hiển thị `dd/mm/yyyy`.
3. Nhập ngày sai bị chặn.
4. Sửa ngày bắt đầu tự đổi ngày kết thúc khi chưa chỉnh tay.
5. Sửa ngày kết thúc rồi đổi ngày bắt đầu không làm mất lựa chọn.
6. Network payload gửi ngày ISO.

Không push GitHub.
