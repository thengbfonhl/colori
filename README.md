# A19 – Colori (Bé Tô Màu)

Bundle id / package: `com.innofly.colori` · Bắt đầu code: 16/11/2026 · Trẻ 3–6 và 7–12 tuổi · Điện thoại + tablet · iOS 16.4+ / Android 7.0+ · Sáng + tối

> **Giai đoạn hiện tại: chỉ làm và test local.** Chưa build EAS, chưa tạo app trên store.

App tô màu cho trẻ em. Bé chọn tranh, chọn màu, rồi chạm để tô từng vùng hoặc vẽ bằng bút. Tranh được lưu vào Bộ sưu tập. App chạy 100% offline, không có server, mạng chỉ dùng cho quảng cáo và Analytics/Crashlytics.

> **Trạng thái (16/11/2026):** P0 (khung app, theme, font) và P1 (pipeline tranh) đã duyệt; P2 (màn tô: tô vùng, zoom, tự lưu) chờ duyệt. Chưa `git init` (theo yêu cầu: tạm thời chỉ để local).

## Chạy trên máy (giai đoạn local)

Cần Node 22 + npm 10, iPhone đã cài **Expo Go** và cùng mạng Wi-Fi với máy tính.

```bash
npm install          # lần đầu (.npmrc đã bật legacy-peer-deps như A06)
cp .env.example .env # lần đầu: biến môi trường local (xem ghi chú trong file)
npm start            # Metro + QR: quét bằng Camera iPhone, mở trong Expo Go (expo start --go)
npm run start:tunnel # khi iPhone và máy tính khác mạng
npm run start:dev    # giai đoạn B: cho development build (có AdMob). Expo Go không dùng lệnh này
```

| Lệnh | Việc |
|---|---|
| `npm run check` | Kiểm tra giấy phép thư viện + `tsc --noEmit` + jest. **Phải qua trước khi báo xong một phase** |
| `npm run art:build` | Xử lý tranh trong `content-src/` (khai nguồn ở `content-src/sources.csv`) → `assets/artworks/` + `src/data/artworks.json`. Soát ảnh `content-out/debug/<id>.png` ([F01](docs/features/F01-pipeline-tranh.md)) |
| `npm run check:release` | `check` + chặn tranh tạm `ai-placeholder` và tranh thiếu bằng chứng giấy phép. **Hiện đang fail** vì 12 tranh test là tranh tạm |
| `npm run licenses` | Liệt kê mọi gói không phải MIT |
| `npm run typecheck` / `npm test` | Chạy riêng TypeScript / jest |
| `npm run build:*` | EAS build. **Không chạy ở giai đoạn local** (D14) |

Thêm thư viện thì dùng `npx expo install <gói>` để Expo chọn bản khớp SDK 58, rồi chạy `npm run check` (gói phải MIT/ISC/BSD/Apache-2.0).

Cấu trúc chính: `app/` (route expo-router), `src/theme.ts` (token màu sáng/tối, font, cỡ chữ), `src/i18n/` (`vi.ts` chuẩn, `en.ts`), `src/store/` (cài đặt), `src/config.ts` (`FEATURES`), `src/lib/env.ts` (`isExpoGo()`), `assets/fonts/` (Be Vietnam Pro + `OFL.txt`). Chi tiết: [docs/features/F08-nen-tang-app.md](docs/features/F08-nen-tang-app.md).

## Đọc theo thứ tự

1. [docs/README.md](docs/README.md): mục lục toàn bộ tài liệu
2. [docs/00-tong-quan.md](docs/00-tong-quan.md): phạm vi v1 và các quyết định đã chốt
3. [docs/04-cau-hoi-mo.md](docs/04-cau-hoi-mo.md): các điểm còn phải chốt trước khi code
4. [docs/05-ke-hoach-tong.md](docs/05-ke-hoach-tong.md): lịch 10.5 ngày công theo phase

## Công nghệ (tóm tắt)

- Expo SDK 58 + React Native + TypeScript strict, điều hướng bằng expo-router.
- Canvas tô màu: `@shopify/react-native-skia` (MIT).
- Build và ký iOS/Android trên **EAS Build (cloud)**, không cần Mac. Cách làm giống A06.
- Chi tiết và lý do chọn: [docs/01-cong-nghe-va-moi-truong.md](docs/01-cong-nghe-va-moi-truong.md)

## Tham khảo từ các project khác

| Project | Lấy gì |
|---|---|
| `irregular_verbs_app` (A06) | Cấu trúc Expo SDK 58, i18n `vi` chuẩn + `en`, theme, store (Context + AsyncStorage), `check-licenses.mjs`, quy tắc interstitial `canShowInterstitial`, eas.json |
| `jlpt_app` | `app.config.js` nạp file Firebase từ biến môi trường EAS, `expo-build-properties` (iOS static frameworks), `eas submit` bằng App Store Connect API key |
| `hatsukai-en/mobile` | Chia profile eas.json (development / preview / store / production), `check-i18n`, `release.mjs` |
