# 喝多少 🍻

記錄你和朋友喝酒時，每個人攝入多少純酒精的 Android App。
資料全部存在手機本機（IndexedDB），離線可用，不需要帳號、網路或任何付費服務。

技術：Capacitor 8 + React 19 + TypeScript + Vite，資料庫用 Dexie，圖表用 Recharts。

---

## 一、用 GitHub 自動打包 APK

專案內已附自動打包設定檔 `ci/build-apk.yml`。GitHub 只認 `.github/workflows/` 裡的設定檔，所以上傳前要先把它複製過去（下面第 2 步的前兩行指令）。

### 1. 上傳到 GitHub

1. 到 <https://github.com/new> 建立一個新的 repository（例如 `drankapp`），**不要**勾選加入 README。
2. 在這個資料夾開啟終端機（PowerShell），執行：

   ```powershell
   mkdir .github\workflows
   copy ci\build-apk.yml .github\workflows\
   git init -b main
   git add .
   git commit -m "first commit"
   git remote add origin https://github.com/你的帳號/drankapp.git
   git push -u origin main
   ```

   沒有裝 git 的話，可以改用 [GitHub Desktop](https://desktop.github.com/)：
   File → Add local repository → 選這個資料夾 → Publish repository。

### 2. 下載 APK

1. 打開 repository 的 **Actions** 分頁，等「打包 Android APK」跑完（約 5 分鐘，出現綠色勾勾）。
2. 兩種下載方式擇一：
   - **Releases**（建議，手機瀏覽器可直接下載）：repository 首頁右側 Releases →「最新版 APK」→ `drankapp-debug.apk`
   - **Artifacts**：點進那次執行紀錄，最下方 Artifacts 下載 `drankapp-debug-apk`（是 zip，解壓後才是 APK）

之後每次 push 到 `main` 都會重新打包；也可以在 Actions 頁面按「Run workflow」手動觸發。

> 若 repository 設為 private，Releases 的下載連結需要登入 GitHub 才能使用。

### 3. 安裝到手機（含「允許安裝未知來源」）

1. 把 `drankapp-debug.apk` 傳到手機（直接用手機瀏覽器下載、LINE 傳給自己、或 USB 複製都可以）。
2. 在手機的「檔案」App 或下載通知中點一下這個 APK。
3. 第一次會跳出「基於安全性考量，你的手機目前不允許安裝這個來源的不明應用程式」：
   點 **設定** → 開啟 **允許這個來源的應用程式**（Pixel 的路徑是
   設定 → 應用程式 → 特殊應用程式存取權 → 安裝不明應用程式 → 選你用來開啟 APK 的 App → 允許）。
4. 回到安裝畫面按 **安裝**。若 Play 安全防護跳出警告，選「仍要安裝」。
5. 安裝完成後，桌面會出現「喝多少」。

更新時直接安裝新的 APK 即可覆蓋，資料會保留（專案固定使用 `android/app/debug.keystore` 簽章，所以每次打包的簽章都相同）。
**移除 App 會清掉所有資料**，移除前請先到「設定 → 資料管理」匯出備份。

---

## 二、在自己的電腦打包（備案）

需要：Node.js 22 以上、[Android Studio](https://developer.android.com/studio)（會一併安裝 JDK 21 與 Android SDK）。

**方法 A：一鍵腳本（Windows）**

1. 安裝 Android Studio，開啟一次並依精靈裝完 SDK。
2. 設定環境變數 `ANDROID_HOME`（通常是 `C:\Users\你\AppData\Local\Android\Sdk`）與
   `JAVA_HOME`（通常是 `C:\Program Files\Android\Android Studio\jbr`）。
3. 雙擊 `build-apk.bat`。
4. APK 會在 `android\app\build\outputs\apk\debug\app-debug.apk`。

**方法 B：用 Android Studio**

1. 在專案資料夾執行 `npm install`，再執行 `npm run sync`（建置網頁並複製進 Android 專案）。
2. Android Studio → Open → 選專案裡的 `android` 資料夾，等 Gradle 同步完成。
3. 選單 Build → Build App Bundle(s) / APK(s) → Build APK(s)。
4. 右下角通知點 locate，就是 `app-debug.apk`。

---

## 三、開發

```bash
npm install
npm run dev      # 在瀏覽器開發（http://localhost:5173）
npm test         # 計算公式的單元測試
npm run build    # 型別檢查 + 建置到 dist/
npm run sync     # 建置並同步到 android/
```

## 四、專案結構

```
drankapp/
├─ ci/build-apk.yml                  GitHub Actions 自動打包設定（上傳前複製到 .github/workflows/）
├─ android/                          Capacitor 產生的 Android 專案
│  └─ app/debug.keystore             固定的 debug 簽章
├─ src/
│  ├─ data/seed.ts                   ★ 種子資料：預設酒款、杯具、參數（要換預設值改這裡）
│  ├─ lib/calc.ts                    純酒精、標準杯、BAC（Widmark）計算
│  ├─ lib/exporter.ts                JSON / CSV 匯出
│  ├─ lib/image.ts                   圖片壓縮（最長邊 512px）
│  ├─ lib/format.ts                  數字、時間、單位格式
│  ├─ db.ts                          Dexie 資料庫、備份匯入匯出、清除
│  ├─ actions.ts                     新增紀錄、重複上一杯、復原等動作
│  ├─ store.tsx                      即時資料（React context）
│  ├─ components/                    共用元件（視窗、成員編輯、紀錄清單…）
│  ├─ pages/                         五個分頁：記錄、場次、統計、酒款與杯具、設定
│  └─ styles.css                     深色酒吧風格樣式
├─ tests/calc.test.ts                計算的單元測試（含手算核對）
├─ capacitor.config.ts               App 名稱與 ID
└─ build-apk.bat                     Windows 本機一鍵打包
```

## 五、計算方式

- 純酒精（g）＝ 容量(ml) × 酒精度(%) ÷ 100 × 酒精密度（預設 0.789 g/ml）
  例：500 ml、5% → 500 × 5 ÷ 100 × 0.789 = 19.725 g
- 標準杯 ＝ 純酒精 ÷ 標準杯克數（預設 10 g，可改 14 g、8 g 或自訂）
- BAC（%）：每喝一筆增加 酒精(g) ÷ (體重(kg) × Widmark 係數 × 10)，再以代謝速率（預設 0.015 %/小時）隨時間遞減
- 「一天」從清晨 5:00 起算（跨午夜續攤算同一天），一週從週一開始

> ⚠️ BAC 只是粗略估算，不可作為能否開車的依據。喝酒不開車，開車不喝酒。

## 六、說明

- 預設酒款只使用文字與 emoji，沒有內建任何品牌 logo 或商品圖；可自行拍照或從相簿選圖。
- 圖片會壓縮後存在本機資料庫，並包含在 JSON 備份裡。
- 預設杯具依台灣常見容量設定：酒吧 shot 以 1 oz ≈ 30 ml 計、熱炒店台啤杯約 143 ml，全部可以修改。
