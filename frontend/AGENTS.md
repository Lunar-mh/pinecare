# frontend/ 鈥?Taro 寰俊灏忕▼搴忕煡璇嗗簱

**Taro 4 + React 18 + TypeScript锛屽井淇″皬绋嬪簭鐢ㄦ埛绔?*

## 缁撴瀯

```
frontend/
鈹溾攢鈹€ src/
鈹?  鈹溾攢鈹€ app.tsx               # Taro 鏍圭粍浠?鈹?  鈹溾攢鈹€ app.config.ts         # 椤甸潰娉ㄥ唽 + TabBar + 鍒嗗寘閰嶇疆
鈹?  鈹溾攢鈹€ app.scss              # 鍏ㄥ眬鏍峰紡
鈹?  鈹溾攢鈹€ assets/               # 闈欐€佽祫婧愶紙tabbar 鍥炬爣绛夛級
鈹?  鈹溾攢鈹€ components/elderly/   # 鑰佸勾浜烘棤闅滅缁勪欢锛堝ぇ瀛椾綋銆侀珮瀵规瘮锛?鈹?  鈹?  鈹溾攢鈹€ LargeButton/
鈹?  鈹?  鈹溾攢鈹€ LargeInput/
鈹?  鈹?  鈹溾攢鈹€ MetricCard/
鈹?  鈹?  鈹溾攢鈹€ SectionTitle/
鈹?  鈹?  鈹溾攢鈹€ ChartCard/
鈹?  鈹?  鈹溾攢鈹€ AlertBanner/
鈹?  鈹?  鈹斺攢鈹€ VoiceEntryButton/
鈹?  鈹溾攢鈹€ pages/                # 涓诲寘椤甸潰锛? 涓級
鈹?  鈹?  鈹溾攢鈹€ login/
鈹?  鈹?  鈹溾攢鈹€ index/            # 鍏虫€€棣栭〉
鈹?  鈹?  鈹溾攢鈹€ services/         # 鏈嶅姟椤?鈹?  鈹?  鈹斺攢鈹€ profile/          # 鎴戠殑
鈹?  鈹溾攢鈹€ subpackages/          # 鍒嗗寘锛?1 涓紝鎸夋ā鍧楀垝鍒嗭級
鈹?  鈹?  鈹溾攢鈹€ health/           # 鍋ュ悍妗ｆ锛?01锛?鈹?  鈹?  鈹溾攢鈹€ medication/       # 鐢ㄨ嵂鎻愰啋锛?02锛?鈹?  鈹?  鈹溾攢鈹€ sos/              # 绱ф€OS锛?03锛?鈹?  鈹?  鈹溾攢鈹€ voice_ai/         # 璇煶浜や簰锛?05锛?鈹?  鈹?  鈹溾攢鈹€ timebank/         # 鏃堕棿閾惰锛?09锛?鈹?  鈹?  鈹溾攢鈹€ family_space/     # 瀹跺涵绌洪棿锛?11锛?鈹?  鈹?  鈹溾攢鈹€ location/         # GPS杩借釜锛?13锛?鈹?  鈹?  鈹溾攢鈹€ medical/          # 鍖荤枟璧勬簮锛?14锛?鈹?  鈹?  鈹溾攢鈹€ ai_consult/       # AI鍋ュ悍鍜ㄨ锛?07锛?鈹?  鈹?  鈹溾攢鈹€ drug_check/       # 鑽墿鐩镐簰浣滅敤锛?08锛?鈹?  鈹?  鈹斺攢鈹€ ai_companion/     # AI浼磋亰锛?10锛?鈹?  鈹溾攢鈹€ services/
鈹?  鈹?  鈹溾攢鈹€ request.ts        # HTTP 灏佽锛堟嫤鎴櫒銆佽秴鏃躲€侀敊璇鐞嗭級
鈹?  鈹?  鈹溾攢鈹€ types.ts          # 鍏ㄥ眬绫诲瀷瀹氫箟
鈹?  鈹?  鈹斺攢鈹€ modules/          # API 妯″潡锛?3 鏂囦欢锛屾寜妯″潡鎷嗗垎锛?鈹?  鈹溾攢鈹€ styles/                # 鍏ㄥ眬鏍峰紡鍙橀噺
鈹?  鈹斺攢鈹€ utils/                # 宸ュ叿鍑芥暟
鈹溾攢鈹€ config/index.ts           # Taro 鏋勫缓閰嶇疆
鈹溾攢鈹€ project.config.json       # 寰俊 IDE 椤圭洰閰嶇疆
鈹溾攢鈹€ babel.config.js           # Babel 棰勮
鈹溾攢鈹€ tsconfig.json             # TypeScript 閰嶇疆
鈹斺攢鈹€ package.json
```

## 鏌ユ壘瀵艰埅

| 浠诲姟 | 浣嶇疆 |
|------|------|
| HTTP 璇锋眰灏佽 | `services/request.ts`锛堝熀浜?Taro.request锛?|
| 鎺ュ彛璋冪敤 | `services/modules/<module>Api.ts` 鈫?`services/request` |
| 绫诲瀷瀹氫箟 | `services/types.ts`锛堝悗绔搷搴?+ 涓氬姟绫诲瀷锛?|
| 涓诲寘椤甸潰 | `pages/<page>/index.tsx` |
| 鍒嗗寘椤甸潰 | `subpackages/<module>/pages/index/index.tsx` |
| 鍒嗗寘閰嶇疆 | `app.config.ts` 鈫?`subPackages` |
| TabBar 閰嶇疆 | `app.config.ts` 鈫?`tabBar` |
| 鑰佸勾浜虹粍浠?| `components/elderly/<Component>/` |
| 鐜鍒ゆ柇 | `request.ts` 鈫?`getEnvVersion()`锛坮elease/dev/trial锛?|
| 寰俊鐧诲綍 | `services/modules/wechatApi.ts`锛堜娇鐢?`wx.login`锛?|
| 寰俊鏀粯 | `services/modules/paymentApi.ts` |
| 钃濈墮杩炴帴 | `services/modules/bluetoothApi.ts`锛堝仴搴疯澶囷級 |
| 鍦板浘/瀹氫綅 | `services/modules/locationApi.ts`锛堥珮寰?寰俊瀹氫綅锛?|
| 闊抽褰曞埗 | `services/modules/voiceApi.ts`锛堣椋?ASR锛?|

## 鏍稿績妯″紡锛堝繀椤婚伒瀹堬級

**HTTP**锛歚get/post/put/del` 浠?`@/services/request` 瀵煎叆
- 缁熶竴 token 娉ㄥ叆銆侀敊璇脊绐椼€?01 璺宠浆鐧诲綍

**璺宠浆**锛歚Taro.navigateTo()` / `Taro.reLaunch()` / `Taro.navigateBack()`

**鍒嗗寘**锛氬湪 `app.config.ts` 鈫?`subPackages` 娉ㄥ唽

**鑰佸勾浜虹粍浠?*锛歚components/elderly/` 涓?`LargeButton`銆乣MetricCard` 绛?
**环境**：`request.ts` 默认使用 `http://127.0.0.1:3001/api/v1`，可通过 `TARO_APP_API_BASE_URL` 显式覆盖

## 鍛戒护

```bash
npm run dev:weapp     # 寮€鍙戞瀯寤猴紙watch 妯″紡锛?npm run build:weapp   # 鐢熶骇鏋勫缓 鈫?dist/weapp
npm run typecheck     # tsc -p tsconfig.json --noEmit
```

## 娉ㄦ剰浜嬮」

- 鍒嗗寘鎬诲ぇ灏忎笉瓒呰繃 2MB锛屽崟涓垎鍖呬笉瓒呰繃 500KB
- `request.ts` 缁熶竴澶勭悊 token 娉ㄥ叆 + 閿欒寮圭獥 + 401 璺宠浆鐧诲綍
- 鏁忔劅鏁版嵁锛堝 token锛夊瓨 `Taro.getStorageSync('token')`锛屼笉瑕佸瓨 `localStorage`
- 寰俊寮€鍙戣€呭伐鍏锋墦寮€ `dist/weapp` 棰勮
- TypeScript 涓ユ牸妯″紡锛歚strict: true`锛岀姝?`any` 闅愬紡
- 鍥捐〃浣跨敤 ECharts锛圱aro 閫傞厤鐗堬級

