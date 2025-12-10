## 目標
- 在 Google 地圖原生路線規劃頁面上，直接偵測目前路線的距離與交通模式，顯示每趟的 pkm 與 CO2e，支援乘客數與係數設定。
- 提供「匯出 Excel」與「下載地圖截圖」功能；Excel 內含行程明細與嵌入截圖。
- 支援多筆累積（storage），可一次匯出多趟。

## 架構
- Manifest V3 擴充功能，僅本機執行，不呼叫付費 API。
- 組件：
  - content script：注入 Google 地圖頁面，讀取距離、模式、建立浮動面板（Shadow DOM）顯示 CO2e 與操作按鈕。
  - background service worker：處理截圖（`chrome.tabs.captureVisibleTab`）、檔案下載、與 content script 溝通。
  - options page：維護碳排係數（kgCO2e/pkm）、預設乘客數與部門欄位等；使用 `chrome.storage` 保存。
  - 共用模組：距離解析、模式對應、CO2e 計算、Excel 匯出（ExcelJS）。

## 權限與安全
- `permissions`: `activeTab`, `tabs`, `storage`, `scripting`, `downloads`。
- `host_permissions`: `https://www.google.*/*`。
- 僅在 maps 網域注入；所有資料保存在 `chrome.storage.local`，不傳出。

## UI 浮動面板（content script）
- 位置：右下角固定，避免遮到原生路線卡片；可拖曳與收合。
- 欄位：
  - 交通工具（自動依 Google 路線模式：transit→`metro/bus`、driving→`car/motorcycle` 可切換）
  - 距離（km，由 DOM 解析；失敗時允許手動覆蓋）
  - 乘客數（預設 1）
  - 係數（依 options 讀取，可下拉選）
  - 計算結果：`pkm`、`CO2e(kg)` 即時計算
  - 按鈕：`新增到列表`、`匯出 Excel`、`下載截圖`
- 監聽：使用 `MutationObserver` 偵測路線面板變更（距離/模式），自動更新計算。

## 距離與模式解析
- 採用 content script 讀取 Google 地圖 Directions 面板文字：
  - 選擇器示例：`div[aria-label*="km"], div[aria-label*="公里"], div.section-directions-trip-distance, div.widget-pane-content`
  - 以正則擷取 `([0-9]+(\.[0-9]+)?)`，優先使用最短距離卡片（第一條建議路線）
- 模式判斷：
  - 當頂部工具列按鍵為 `駕車/Transit`，對應 `driving/transit`；transit 再細分使用者在面板中點選的子模式（捷運/公車）

## CO2e 計算
- `pkm = 距離_km × 乘客數`
- `CO2e(kg) = pkm × 係數(kgCO2e/pkm)`
- 係數來源：options（預設值：`metro: 0.041`, `bus: 0.105`, `car: 0.192`, `motorcycle: 0.103`）

## 匯出 Excel（ExcelJS）
- 內容：
  - 工作表 `行程明細`：表頭為 `查查屬區, 申請單號, 員工編號, 員工姓名, 出發日期, 起點, 終點, 交通工具, 乘客數, 每人單次里程(pkm), 運輸碳排放係數(kgCO2e/pkm), CO2e(kg)`
  - 工作表 `截圖`：將對應地圖截圖插入 `A1` 開始的位置；另建立 Named Range `MAP_AREA` 指向插入格以利後續固定版位
- 流程：
  - 使用 `chrome.tabs.captureVisibleTab` 取得 dataURL → 轉為 base64 → ExcelJS `workbook.addImage`
  - 每筆行程插入一列，圖片依筆數垂直排列（或僅插入最新一筆）
  - 下載檔案：`chrome.downloads.download`，檔名 `S3C6_商務旅行_Demo-2025.xlsx`
- 備援：若圖片嵌入失敗，退回生成 CSV + 另存 PNG 截圖兩個檔案。

## 多筆累積
- `新增到列表` 將目前頁面的路線資料（起點/終點以輸入框文字、距離、模式、乘客數、係數）存入 `chrome.storage.local` 的 `trips[]`。
- `匯出 Excel` 匯出全部 `trips[]`，並清空或保留（可選）。

## 檔案結構
- `manifest.json`（MV3）
- `src/content.js`：UI overlay、距離解析、計算、與背景互通
- `src/background.js`：截圖、下載
- `src/options.html` + `src/options.js`：係數設定 UI
- `src/excel.js`：ExcelJS 打包（以 Rollup/Webpack bundle），匯出邏輯
- `src/styles.css`：面板樣式

## 主要程式邏輯（摘要）
- content.js：
  - 掛載 Shadow DOM 面板 → 讀取距離/模式 → 計算顯示
  - `新增到列表` → `chrome.storage.local.set`
  - `下載截圖` → `chrome.runtime.sendMessage({type: 'CAPTURE'})`
  - `匯出 Excel` → 取 `trips[]` 與目前截圖 → 呼叫 `excelExport(trips, screenshotDataURL)` → `chrome.downloads.download`
- background.js：
  - 監聽 `CAPTURE` → `chrome.tabs.captureVisibleTab` 返回 dataURL
- excel.js：
  - 依表頭建檔 → 插入列資料 → `workbook.addImage({base64})` → `worksheet.addImage(imgId, 'A1:D20')` → 生成 Blob → 下載

## 開發與驗證
- 本地載入：Chrome → 管理擴充功能 → 開發者模式 → 載入未封裝 → 指向專案資料夾
- 測試場景：
  - 駕車、捷運、公車、機車（使用駕車距離但係數不同）
  - 距離解析變更（DOM 變動）→ 正則與備援選擇器
  - 匯出 Excel 是否含正確資料與圖片；Named Range 是否存在

## 風險與對策
- Google 地圖 DOM 可能變動 → 使用多組選擇器與 MutationObserver；必要時允許手動距離覆蓋
- Excel 圖片嵌入在瀏覽器端可能受限 → 以 ExcelJS 為主，失敗則退回 CSV + PNG
- 截圖需使用 `captureVisibleTab` 權限 → 在 manifest 聲明並由 background 代為呼叫

## 交付
- 可安裝的 MV3 擴充功能原始碼（含打包指令與 README）
- 支援的係數預設與 options 管理，與可匯出 `S3C6_商務旅行_Demo-2025.xlsx` 格式相容的內容結構

## 需要確認
- 是否一定要把圖片嵌入到指定區（Named Range 名稱）或可以放入 `截圖` 工作表即可
- 係數是否採用既有公司的標準；是否需要在面板中快速切換係數集（多版本）