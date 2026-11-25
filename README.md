<h1 align="center">Colori – Bé Tô Màu</h1>

<p align="center">
  <strong>App tô màu cho trẻ em 3–12 tuổi.</strong><br />
  Bé chọn tranh, chọn màu, chạm để tô từng vùng hoặc vẽ tự do bằng bút. Chạy offline, không cần tài khoản.
</p>

<p align="center">
  <img alt="Expo SDK 58" src="https://img.shields.io/badge/Expo-SDK%2058-000?logo=expo&logoColor=fff" />
  <img alt="React Native 0.88" src="https://img.shields.io/badge/React%20Native-0.88-000?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-000?logo=typescript&logoColor=3178C6" />
  <img alt="Platforms" src="https://img.shields.io/badge/iOS%2016.4%2B%20%C2%B7%20Android%207.0%2B-000" />
  <img alt="UI languages" src="https://img.shields.io/badge/UI-Ti%E1%BA%BFng%20Vi%E1%BB%87t%20%C2%B7%20English-FFB800" />
</p>

---

## Tổng quan

Colori là app tô màu dành cho trẻ em, bundle id / package `com.innofly.colori`. App không có server và không gọi
API: tranh, tác phẩm và cài đặt đều nằm trên máy. Mạng chỉ dùng cho quảng cáo và Analytics / Crashlytics.

| | |
|---|---|
| **Tô màu** | Chạm để tô từng vùng, zoom và kéo tranh, hoàn tác / làm lại, chế độ tô không tràn viền, tự lưu |
| **Vẽ tự do** | Giấy trắng, bút màu nhiều cỡ và cục tẩy |
| **Thư viện tranh** | Tranh theo chủ đề (động vật, biển, xe cộ, Việt Nam…) và 2 mức: `easy` (3–6 tuổi) / `medium` (7–12 tuổi) |
| **Trang chủ** | Tranh của ngày, tiếp tục tranh đang tô, gợi ý theo độ tuổi, ngôi sao thưởng |
| **Bộ sưu tập** | Tranh đã hoàn thành, đang tô, yêu thích; thống kê số tranh, thời gian sáng tạo và chuỗi ngày |
| **Cá nhân** | Avatar, độ tuổi, âm thanh khi tô, ngôn ngữ, mục "Dành cho bố mẹ" |

App hỗ trợ điện thoại và tablet, chỉ màn dọc, có giao diện sáng và tối theo máy (giấy tô luôn trắng).
v1 chỉ có trải nghiệm **Kids**; Adult mode, tạo tranh bằng AI và một số tính năng khác đã có code nhưng đang tắt bằng
`FEATURES` trong [`src/config.ts`](src/config.ts).

**App trẻ em (Families / Kids):** có parental gate trước link ngoài, chia sẻ, lưu ảnh, đánh giá app và mục
"Dành cho bố mẹ". Quảng cáo chỉ có interstitial khi thoát màn tô, không cá nhân hoá, `tagForChildDirectedTreatment`,
rating G. Không thu thập AAID / IDFA, không gọi ATT.

## Công nghệ

| Mảng | Lựa chọn |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) |
| Điều hướng | expo-router (route theo file) |
| Canvas | `@shopify/react-native-skia` (tô vùng theo region map, nét vẽ, zoom) |
| Lưu trữ | AsyncStorage (cài đặt, danh sách tác phẩm), expo-file-system (ảnh tác phẩm) |
| Âm thanh / rung | expo-audio (âm báo ngắn), expo-haptics |
| Quảng cáo / đo lường | `react-native-google-mobile-ads`, `@react-native-firebase` (Analytics, Crashlytics) — chỉ có trong development build và bản store |
| i18n | `vi.ts` là chuẩn, `en.ts` phải đủ key (TypeScript báo lỗi nếu thiếu) |
| Công cụ | Jest (`jest-expo`), `node --test` cho script, EAS Build |

## Bắt đầu

**Yêu cầu:** Node 22, npm 10. Để chạy trên điện thoại: cài **Expo Go** và để điện thoại cùng mạng Wi-Fi với máy tính.

```bash
npm install            # .npmrc đã bật legacy-peer-deps
cp .env.example .env   # biến môi trường, để trống thì dùng giá trị mặc định
npm start              # Metro + mã QR: quét bằng Camera, mở trong Expo Go
```

Khi điện thoại và máy tính khác mạng thì dùng `npm run start:tunnel`.

AdMob và Firebase là native module nên không chạy trong Expo Go. Trên Expo Go, app dùng lớp bọc `isExpoGo()`
([`src/lib/env.ts`](src/lib/env.ts)) để bỏ qua quảng cáo và đo lường. Muốn thử quảng cáo thì cần development build
và chạy `npm run start:dev`.

### Biến môi trường

Mọi biến nằm trong `.env` (xem [`.env.example`](.env.example)). `app.config.js` đọc rồi đưa vào `extra`, code đọc
lại qua [`src/config.ts`](src/config.ts). Sửa `.env` xong phải khởi động lại `npm start`.

| Biến | Dùng cho | Mặc định |
|---|---|---|
| `APP_ENV` | `development` · `preview` · `store-test` · `production` | `development` |
| `PRIVACY_URL` · `CONTACT_EMAIL` | Link chính sách và email liên hệ ở màn Thông tin | giá trị tạm `example.com` |
| `IOS_APP_STORE_ID` | Nút "Đánh giá app" trên iOS | — |
| `ADMOB_APP_ID_IOS` · `ADMOB_APP_ID_ANDROID` | AdMob App ID, chỉ đọc khi `APP_ENV=production` | App ID mẫu của Google |
| `ADMOB_INTERSTITIAL_IOS` · `ADMOB_INTERSTITIAL_ANDROID` | Ad unit interstitial, chỉ đọc khi `APP_ENV=production` | Test Ad ID |
| `GOOGLE_SERVICES_PLIST` · `GOOGLE_SERVICES_JSON` | Đường dẫn file cấu hình Firebase (không đưa lên git) | `./GoogleService-Info.plist` · `./google-services.json` |

> App không có khoá bí mật. Bản `production` thiếu AdMob ID, còn ID test hoặc thiếu file Firebase thì
> `app.config.js` báo lỗi và không build.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm start` | Chạy Metro cho Expo Go |
| `npm run start:tunnel` | Như trên, qua tunnel (khác mạng) |
| `npm run start:dev` | Chạy Metro cho development build |
| `npm run art:build` | Xử lý tranh trong `content-src/` → `assets/artworks/` + `src/data/artworks.json`. Ảnh soát lỗi ở `content-out/debug/<id>.png` |
| `npm run sounds:build` | Sinh lại âm báo trong `assets/sounds/` |
| `npm run oss:build` | Sinh lại danh sách giấy phép thư viện cho màn "Giấy phép" |
| `npm run licenses` | Liệt kê mọi gói không phải MIT |
| `npm run typecheck` · `npm test` | Chạy riêng TypeScript / Jest |
| `npm run check` | Kiểm tra tranh đã build + giấy phép thư viện + danh sách OSS + test script + `tsc` + Jest. **Phải xanh trước khi push** |
| `npm run check:release` | `check` + chặn tranh tạm `ai-placeholder` và tranh thiếu bằng chứng giấy phép. Hiện đang fail vì tranh test vẫn là tranh tạm |

Thêm thư viện thì dùng `npx expo install <gói>` để Expo chọn bản khớp SDK 58, rồi chạy `npm run check`.

### Build (EAS)

| Profile | `APP_ENV` | Kết quả |
|---|---|---|
| `development` | development | Dev client, nội bộ (Android APK) |
| `preview` | preview | Bản nội bộ (Android APK), quảng cáo test |
| `store-test` | store-test | Bản lên store để test (TestFlight / internal testing), quảng cáo test |
| `production` | production | Bản phát hành, ID quảng cáo thật |

```bash
npm run build:android   # preview, Android
npm run build:ios       # store-test, iOS
npm run build:prod      # production, cả 2 nền tảng
```

`.env` không được gửi lên EAS, nên phải khai các biến trên trong EAS environment variables (file Firebase khai bằng
biến kiểu "file" cùng tên).

## Thêm tranh

1. Bỏ file PNG nét đen nền trắng vào `content-src/<chủ đề>/<tên>-<easy|medium>.png`.
2. Khai một dòng trong [`content-src/sources.csv`](content-src/sources.csv): id, tên tiếng Việt / tiếng Anh, chủ đề,
   mức, nguồn, giấy phép và bằng chứng (lưu trong `content-src/_licenses/`).
3. Chạy `npm run art:build` rồi xem ảnh soát lỗi trong `content-out/debug/`. Tham số tách vùng nằm ở
   [`scripts/artwork.config.json`](scripts/artwork.config.json) (có thể ghi đè riêng từng tranh).

**Không sửa tay** `assets/artworks/**` và `src/data/artworks*.{json,ts}`: các file này do script sinh ra.
Tranh có `source_type = ai-placeholder` chỉ dùng để test.

## Cấu trúc dự án

```text
colori/
├─ app/                    route (expo-router)
│  ├─ (tabs)/              Trang chủ · Vẽ tự do · Bộ sưu tập · Cá nhân
│  ├─ category/[id]        danh sách tranh theo chủ đề
│  ├─ color/[artworkId]    màn tô màu
│  ├─ draw/[workId]        màn vẽ tự do
│  ├─ complete/[workId]    màn hoàn thành
│  ├─ work/[workId]        chi tiết tác phẩm
│  └─ onboarding · about · licenses
├─ src/
│  ├─ engine/              region map, nét vẽ, lớp tô, lịch sử hoàn tác, zoom
│  ├─ components/          nút, bảng màu, icon, minh hoạ · paint/ (canvas, thanh công cụ, tự lưu)
│  ├─ features/            ads · analytics · gate (parental gate) · works · home · feedback
│  ├─ store/               cài đặt và tác phẩm (Context + reducer + AsyncStorage)
│  ├─ data/                danh mục, catalog, tranh (sinh ra), danh sách OSS (sinh ra)
│  ├─ i18n/                vi.ts (chuẩn) · en.ts
│  ├─ lib/                 env (isExpoGo), định dạng, điều hướng
│  ├─ config.ts            FEATURES, cấu hình quảng cáo
│  └─ theme.ts             token màu sáng / tối, font, cỡ chữ
├─ assets/                 artworks/ (sinh ra) · fonts/ (Be Vietnam Pro, OFL) · sounds/
├─ content-src/            tranh gốc + sources.csv + bằng chứng giấy phép
└─ scripts/                build-artworks · build-sounds · check-licenses · check-release · gen-oss-notices
```

## Quy ước

- **Text:** mọi chữ trên giao diện đi qua `t()`. Thêm key vào `vi.ts` trước rồi `en.ts`.
- **Màu:** chỉ dùng token trong `src/theme.ts` (bộ sáng + bộ tối), không viết mã màu trực tiếp trong component.
- **Thư viện:** chỉ MIT (ưu tiên), ISC, BSD hoặc Apache-2.0. Không dùng GPL / AGPL / LGPL hay giấy phép thương mại.
  Không dùng `sharp` (libvips là LGPL); xử lý ảnh trong script dùng `pngjs`. `npm run check` sẽ kiểm tra.
- **Nội dung:** tranh, font, icon, âm thanh phải tự làm hoặc có nguồn cho phép dùng thương mại.
- **Quảng cáo:** chỉ interstitial khi thoát màn Tô màu / Hoàn thành / Vẽ tự do, theo `canShowInterstitial` trong
  [`src/features/ads/rules.ts`](src/features/ads/rules.ts): cách nhau ít nhất 3 phút, không hiện trong 30 giây đầu.
- **Trước khi push:** `npm run check` phải xanh.

---

<p align="center"><sub>© 2026 Innofly Software. All rights reserved.</sub></p>
