# 📐 InternLink UI Design System — Bảng Quy Tắc Thiết Kế

> **Phiên bản:** 2.0 — Cập nhật 07/10/2026
> **Trang chuẩn gốc:** `/student/dashboard`
> **Áp dụng cho:** Student · Lecturer · Admin Khoa · SuperAdmin

---

## 🎨 1. Bảng Màu Bắt Buộc

### Brand Primary
| Trạng thái | Mã HEX | Preview |
|---|---|---|
| Default | `#026aa7` | 🟦 |
| Hover | `#025a8e` | 🟦 |
| Active | `#005082` | 🟦 |

> ⛔ **CẤM:** `#1e40af` `#2563eb` `#3b82f6` `#1d4ed8` — Không dùng bất kỳ blue/indigo Tailwind nào cho brand.

### Chart Palette
| Tên | HEX | Dùng cho | ⛔ Cấm nhầm |
|---|---|---|---|
| Blue | `#4d74c9` | Cột/đường chính, Đang TT, Đã duyệt | `#3b82f6` `#2563eb` |
| Sky | `#38bdf8` | Chờ duyệt, Cần phản hồi | `#0ea5e9` |
| **Lime Green** | **`#7bc043`** | **Hoàn thành, Mốc chuẩn, labelLine** | **`#10b981` `#22c55e`** |
| Amber | `#f59e0b` | Trễ hạn, Cảnh báo | `#f97316` |
| Amber Light | `#fbbf24` | Bar "Nộp trễ" | — |

> ⚠️ **LƯU Ý ĐẶC BIỆT:** Màu "hoàn thành" là `#7bc043` (lime green). **KHÔNG BAO GIỜ** dùng `#10b981` (emerald-500) trong project này.

---

## 🏗️ 2. Cấu Trúc Layout

### Dashboard (mọi role):
```
┌─────────────────────────────────────────────────────┐
│  Banner Header (bg-[#026aa7])                        │
│  d1: Thông tin cá nhân (text inline)                 │
│  d2: 3 dropdown bo tròn (rounded-full)               │
├─────────────────────────────────────────────────────┤
│  4 KPI Cards (grid-cols-4)  ← CHỈ Ở DASHBOARD       │
├──────────────────────┬──────────────────────────────┤
│  Chart 1 (Composed)  │  Chart 2 (PieChart)          │
│  + Toolbar + Legend   │  + Left Legend + Footer      │
├──────────────────────┴──────────────────────────────┤
│  Phần nghiệp vụ phía dưới (tùy role)                │
└─────────────────────────────────────────────────────┘
```

### Sub-pages (submissions, reports, students, ...):
```
┌─────────────────────────────────────────────────────┐
│ Header (bg-[#026aa7]) 
| Nội dung chính (bảng, form, chi tiết...)            |
├─────────────────────────────────────────────────────┤
│  ❌ KHÔNG CÓ KPI CARDS                             │
├─────────────────────────────────────────────────────┤

```

---

## 📊 3. Quy Tắc Biểu Đồ

### ComposedChart (Thẻ trái)
- Bar chính: `fill="#4d74c9"`, radius `[2,2,0,0]`
- Bar phụ (trễ): `fill="#fbbf24"`
- Line mốc chuẩn: `stroke="#7bc043"`, strokeWidth `2`
- Line dot: `r: 3.5, fill: #ffffff, stroke: #7bc043`
- Grid: `stroke="#dbeafe"`, không nét đứt, không dọc
- Toolbar: Table | Line | Bar | Refresh | Download

### PieChart (Thẻ phải)
- `outerRadius`: 78–80
- `startAngle`: 90, `endAngle`: -270
- **`labelLine`**: `stroke="#7bc043"` ← ⚠️ KHÔNG dùng `#94a3b8`
- Cell stroke: `#ffffff`

---

## 🚫 4. KPI Cards — Kỷ Luật

| Trang | KPI 4 thẻ |
|---|---|
| `*/dashboard` | ✅ Được phép |
| `*/submissions` | ❌ CẤM |
| `*/templates` | ❌ CẤM |
| `*/feedback` | ❌ CẤM |
| `*/evaluation` | ❌ CẤM |
| `*/notifications` | ❌ CẤM |
| `*/account` | ❌ CẤM |
| `*/students` | ❌ CẤM |
| `*/reports` | ❌ CẤM |
| `*/evaluations` | ❌ CẤM |
| Mọi trang khác | ❌ CẤM |

---

## 📝 5. Dữ Liệu

- ✅ Lấy 100% từ API backend (appState, context, service)
- ❌ KHÔNG mock data, KHÔNG số giả
- ❌ KHÔNG hardcode fallback bằng số cụ thể
- ✅ Empty state: icon + text hướng dẫn
- ✅ Fallback text: `"—"` hoặc `"Chưa cập nhật"`

---

## ✅ 6. Checklist Bắt Buộc (Mỗi trang phải đạt 100%)

| # | Kiểm tra | Pass? |
|---|---|---|
| 1 | Banner dùng `#026aa7` | ☐ |
| 2 | Chart colors đúng bảng §1 | ☐ |
| 3 | `labelLine` PieChart = `#7bc043` | ☐ |
| 4 | KPI chỉ ở Dashboard | ☐ |
| 5 | Không data mock/ảo | ☐ |
| 6 | Empty state đúng chuẩn | ☐ |
| 7 | `npx tsc --noEmit` exit 0 | ☐ |
| 8 | Link/button dùng `#026aa7` | ☐ |
| 9 | Container `max-w-[1300px]` | ☐ |
| 10 | Card `rounded-xl border-slate-200/90 shadow-2xs` | ☐ |

---

> 💡 File này được tự động enforce bởi `.agents/rules/ui-design-system.md`. AI sẽ tự kiểm tra theo bảng quy tắc mỗi khi chỉnh sửa UI.
