# 擴充 Google 地圖計算碳排放 / 计算 Google 地图碳排放 / Google Maps CO2 Calculator / Google マップCO2計算拡張

## 繁體中文
- 安裝：Chrome → 擴充功能 → 開發者模式 → 載入未封裝 → 指向 `chrome_ext/`
- 權限：`activeTab`、`storage`、`downloads`、`scripting`、`<all_urls>`（擷取截圖）
- 功能：
  - 自動解析距離、交通工具；手動輸入乘客數、係數
  - 顯示 `pkm`、`CO2e(kg)`；縮小面板僅顯示結果與截圖按鈕
  - 列表累積、CSV 匯出、地圖截圖（裁切至地圖視窗）
  - 道路型態與速度：機車 50、汽車省道 50、汽車國道 100、捷運 40、公車 40（km/hr）
  - 估算時間（分）= 距離 ÷ 速度 × 60
- 來源：
  - 高鐵速度參考：https://www.thsrc.com.tw/ArticleContent/5a1f4c72-b564-4706-bcdd-efbda93c3d93
  - 大客車資料集：https://data.gov.tw/dataset/33217、https://data.gov.tw/dataset/32143、https://data.gov.tw/dataset/33215
- 授權：GPLv3（見 `LICENSE`）

## 简体中文
- 安装：Chrome → 扩展程序 → 开发者模式 → 加载已解压 → 指向 `chrome_ext/`
- 权限：`activeTab`、`storage`、`downloads`、`scripting`、`<all_urls>`（截图）
- 功能：自动解析距离与交通工具；手动输入乘客数与系数；显示 `pkm`、`CO2e(kg)`；列表与 CSV；地图截图；道路类型与速度默认；时间估算。
- 速度默认（km/hr）：机车 50、汽车省道 50、汽车高速 100、地铁 40、公交 40。
- 数据来源：同上。
- 许可：GPLv3。

## English
- Install: Chrome → Extensions → Developer Mode → Load unpacked → `chrome_ext/`
- Permissions: `activeTab`, `storage`, `downloads`, `scripting`, `<all_urls>` (capture)
- Features:
  - Auto parse distance and mode; manual passengers and factor
  - Show `pkm`, `CO2e(kg)`; collapsed panel shows results and screenshot only
  - Trip list, CSV export, cropped map screenshot
  - Road type and speed defaults (km/hr): motorcycle 50, car surface 50, car highway 100, metro 40, bus 40
  - Time (min) = distance / speed × 60
- Sources:
  - HSR reference: https://www.thsrc.com.tw/ArticleContent/5a1f4c72-b564-4706-bcdd-efbda93c3d93
  - Bus datasets: https://data.gov.tw/dataset/33217, https://data.gov.tw/dataset/32143, https://data.gov.tw/dataset/33215
- License: GPLv3.

## 日本語
- インストール：Chrome → 拡張機能 → デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ `chrome_ext/`
- 権限：`activeTab`、`storage`、`downloads`、`scripting`、`<all_urls>`（スクリーンショット）
- 機能：距離と交通手段の自動解析／乗客数・係数入力／`pkm`・`CO2e(kg)`表示／リストとCSV／地図スクリーンショット／道路種別と速度既定／所要時間計算。
- 速度既定（km/hr）：バイク 50、車（一般道）50、車（高速）100、地下鉄 40、バス 40。
- 出典：上記リンク参照。
- ライセンス：GPLv3。

---

## Push to GitHub
1. Initialize repo
   ```powershell
   cd .
   git init
   git add -A
   git commit -m "Initial release: Google Maps CO2 extension (GPLv3)"
   ```
2. Create a public repo named `google-maps-co2-extension` on GitHub (License: GPLv3)
3. Set remote and push
   ```powershell
   git remote add origin https://github.com/<your-username>/google-maps-co2-extension.git
   git branch -M main
   git push -u origin main
   ```
4. Add topics: `chrome-extension`, `google-maps`, `co2`, `carbon-footprint`, `csv`

