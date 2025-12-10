## 目標
- 建立可重複操作的工具，逐筆輸入出差「單趟」行程與交通工具，抓取 Google 地圖路線、距離與截圖，計算 CO2e，寫入並嵌入到 `S3C6_商務旅行_Demo-2025.xlsx` 指定區域。

## 交付內容
- 一個 Python 工具與指令腳本：`trip_co2.py`
- 設定檔：`config/emission_factors.json`（各交通工具的 kgCO2e/pkm 係數）
- 匯出截圖資料夾：`artifacts/`（每趟行程的地圖 PNG）
- 更新 Excel：將每筆資料與對應截圖嵌入到現有活頁簿指定欄位/區塊

## 路線與截圖取得
- 使用 Playwright 自動開啟 Google 地圖 Directions：
  - `metro`、`bus` → `travelmode=transit`
  - `car`、`motorcycle` → `travelmode=driving`（機車以駕車距離近似，係數不同）
- 等待路線載入後：
  - 擷取建議路線的距離（公里），若有多條路線以最短距離為主
  - 針對地圖視窗（Canvas/Scene 容器）做區塊截圖，裁切非必要面板
- 產出檔名：`artifacts/<日期>_<員工>_<mode>_<起點>_<終點>.png`

## Excel 寫入與嵌圖
- 讀取並更新 `S3C6_商務旅行_Demo-2025.xlsx`：
  - 於資料表（如 `行程明細`）新增一列：部門、單號、員編、姓名、出發日期、起點、終點、交通工具、距離（pkm）、係數、CO2e（kg）
  - 於指定版位（或新設 `截圖` 工作表）插入對應 PNG，與列索引關聯
- 若既有範本含「指定區」或 Named Range，工具會自動定位並嵌圖到該位置；若無則以一致版型新增兩個工作表：`行程明細`、`截圖`

## 計算邏輯
- `pkm = 距離_km × 乘客數`（預設 1，可於指令指定，如 `--passengers 2`）
- `CO2e (kg) = pkm × 係數 (kgCO2e/pkm)`
- 係數預設值（可在 `config/emission_factors.json` 調整）：
  - `metro`: 0.041、`bus`: 0.105、`car`: 0.192、`motorcycle`: 0.103（可依公司係數覆寫）

## 資料輸入方式
- 方式 A（CLI 逐筆新增）：
  - `python trip_co2.py add --mode metro --origin "台北車站" --destination "板橋站" --date 2025-01-02 --dept "範例" --ticket "T-0001" --emp_id "E001" --emp_name "王小明"`
  - 自動抓距離、計算、截圖並寫入 Excel 指定區域
- 方式 B（Excel 先填表，腳本掃描）：
  - 在範本表格先行輸入多筆行程，腳本逐列處理、補距離、計算與嵌圖

## 驗證與容錯
- 針對示例行程（捷運 板橋→台北）驗證：距離解析、CO2e 計算、圖片尺寸與錨點是否符合指定區
- 若 Google 地圖元素變更：
  - 退回全頁截圖並以識別關鍵座標裁切
  - 擷取距離失敗時，可切換以地圖量測估距或人工輸入距離（`--distance-km` 覆蓋）

## 使用步驟
- 安裝 Python 與相依套件（`openpyxl`, `playwright`, `pillow` 等），並執行 `playwright install`
- 依需求選擇方式 A 或 B
- 產出 Excel 與 PNG，檢查指定區的版面配置

## 權限與限制
- 不使用付費 API Key；直接從 Google 地圖頁面讀取資訊與截圖
- Google 使用條款：僅作為內部報告用途；若大量自動化或對外發布，需評估授權

## 後續擴充
- 加入不同時段/路線比較（最短時間 vs 最短距離）
- 支援共乘人數、里程回填與多幣別成本欄位
- 依既有範本命名的 Named Range 自動對齊版位

## 需要確認
- `S3C6_商務旅行_Demo-2025.xlsx` 的指定截圖區域位置與工作表/儲存格命名
- 公司採用之標準碳排係數（若與預設不同）
- 是否偏好「Excel 先填表」或「CLI 逐筆新增」流程