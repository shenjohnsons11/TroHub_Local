# TroHub UI Redesign Design

## 1. Pham vi

Thiet ke lai toan bo giao dien cua ba ung dung trong repository:

- Expo Mobile tai thu muc goc.
- Web Admin legacy tai `webadmin/`.
- Web Admin Next.js tai `webadmin-next/`.

Giai doan nay chi tao prototype giao dien de review. Khong thay doi backend, API contract, database, phan quyen hoac nghiep vu. Du lieu that dang co trong source duoc dung de minh hoa; khong them noi dung placeholder.

## 2. Design Read

Reading this as: he thong quan ly nha tro da nen tang cho nguoi dung pho thong, voi ngon ngu hien dai, premium va de doc, leaning toward native design tokens, responsive product UI va nhan dien hinh khoi cam, xanh la, xam.

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 6`

## 3. Nhan dien

Logo chon concept A:

- Bieu tuong `TH` gom hai khoi nghieng doc lap.
- Khoi `T` mau cam, khoi `H` mau xanh la.
- Wordmark viet hoa `TRO HUB`, mau xam dam tren light theme va xam sang tren dark theme.
- Khong sao chep hinh dang logo cua thuong hieu khac.
- Logo day du dung o login, loading va sidebar rong. Bieu tuong rut gon dung o mobile header, favicon va sidebar thu gon.

## 4. Theme System

Light theme:

- Nen chinh xam lanh sang.
- Surface gan trang, khong dung trang tinh tren toan bo trang.
- Text xam than.
- Cam cho CTA chinh va selected state.
- Xanh la cho thanh cong va trang thai tich cuc.

Dark theme:

- Nen than trung tinh, khong dung den tinh.
- Surface sang hon nen mot bac.
- Text xam trang, giu phan cap tuong duong light theme.
- Cam va xanh la giu nhan dien, hieu chinh do sang de dat contrast.

Theme mac dinh theo he dieu hanh. Nut chuyen theme cho phep ghi de va luu lua chon cuc bo.

## 5. Shape, Typography Va Spacing

- Control radius: 9px.
- Surface radius: 13px.
- Modal radius: 16px.
- Pill chi dung cho badge va segmented control.
- Font sans hien co cua tung runtime, uu tien hieu nang va ho tro tieng Viet.
- Vung cham toi thieu 44x44px.
- Heading gon, body de doc, khong scale font theo chieu rong viewport.
- Khoang cach dung semantic scale thong nhat giua ba codebase.

## 6. Logo Va Loading Screen

Loading screen xuat hien khi khoi tao ung dung, phuc hoi session hoac chuyen vao shell sau dang nhap:

- Logo `TH` o trung tam.
- Wordmark `TRO HUB` ben duoi.
- Thanh tien trinh ngan mau cam.
- Thong diep theo ngu canh, vi du `Dang chuan bi khong gian cua ban`.
- Light va dark theme co cung cau truc.
- Reduced motion chuyen thanh trang thai tinh, khong lap animation.

Tai man hinh con, skeleton theo hinh dang noi dung thay cho loading screen toan trang.

## 7. Expo Mobile

- Giu navigation va thu tu man hinh hien co.
- Login duoc tai cau truc theo nhan dien moi, form mot cot va loi inline.
- Home/Admin Dashboard co metric chinh noi bat, metric phu theo grid hai cot va cac hanh dong nhanh ro rang.
- Danh sach hoa don, hop dong, phong, nguoi thue va yeu cau sua chua dung surface phang, badge co ngu nghia va khoang cach de quet.
- Bottom navigation giu nguyen chuc nang, tang focus/selected contrast va ton trong safe area.
- Modal, form va empty/error/loading state duoc chuan hoa.

## 8. Web Admin Legacy

- Giu nguyen entry URL, `data-action`, navigation labels va rendering flow.
- Doi CSS variables sang token moi.
- Sidebar desktop co logo day du; tablet thu gon; mobile dung drawer.
- Dashboard, table, form va modal dung cung hierarchy voi Next.js.
- Table desktop de quet, tablet cuon ngang co indicator, mobile hien thi cac truong quan trong theo block co cau truc.

## 9. Web Admin Next.js

- Giu nguyen route hien co.
- Dung CSS variables semantic trong Tailwind v4.
- Login/register giu chuc nang hien co, chi thay doi bo cuc va visual states.
- Dashboard shell, sidebar, tables, dialogs va forms dong nhat voi Web Admin legacy.
- Khong them dependency moi trong prototype.

## 10. Responsive

- Desktop: sidebar day du, content max-width co kiem soat, table uu tien kha nang quet.
- Tablet: sidebar thu gon, grid giam cot, form giu label va focus state ro rang.
- Mobile: mot cot, padding 16px, CTA full-width khi can, table chuyen thanh block/list.
- Moi layout nhieu cot co fallback ro rang duoi 768px.
- Khong dung `h-screen`; su dung don vi viewport on dinh khi can full-height.

## 11. Accessibility

- WCAG AA cho body text, button, form, badge va focus ring.
- Keyboard focus visible tren web.
- Label, helper va error state co lien ket semantic trong ban hoan thien; prototype chua khoa noi dung field de nguoi dung review sau.
- Icon button co accessible label.
- Khong dung mau sac nhu tin hieu duy nhat.
- `prefers-reduced-motion` tat animation khong thiet yeu.
- `prefers-color-scheme` chon theme mac dinh.

## 12. Motion

Motion chi phuc vu:

- Phan cap khi vao man hinh.
- Feedback khi nhan button/tab.
- Chuyen theme va loading state.
- Mo/dong modal va drawer.

Chi animate `transform` va `opacity`. Khong dung scroll listener, parallax hoac scroll hijack.

## 13. Trang Thai Giao Dien

Moi pattern quan trong co du:

- Loading skeleton.
- Empty state voi hanh dong phu hop.
- Error inline hoac contextual.
- Disabled state.
- Hover, active va focus tren web.
- Selected va pressed state tren mobile.

## 14. Kiem Thu Prototype

- Root Expo: lint va TypeScript check.
- Web Admin legacy: syntax check va Cypress smoke flow hien co.
- Web Admin Next.js: lint, TypeScript va production build.
- Visual check tai desktop 1440px, tablet 768px va mobile 390px.
- Kiem tra light/dark, contrast, keyboard focus va reduced motion.
- Taste Skill pre-flight phai pass truoc khi ban giao.

## 15. Tieu Chi Hoan Thanh Giai Doan Prototype

- Ba ung dung cung nhan dien `TH / TRO HUB`.
- Light va dark theme nhat quan.
- Loading screen moi hien thi dung tren Mobile va hai Web Admin.
- Cac route va chuc nang hien tai khong bi xoa.
- Prototype mo duoc de review tren desktop, tablet va mobile.
- Khong co thay doi backend hoac API.
