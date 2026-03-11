# 延安医疗目录数据来源说明

## 已导入的本地目录范围

当前已整理为第一版延安本地医疗目录数据集，写入文件：

- [medical-directory.real.json](/D:/03_Study/Desktop/old/backend/templates/medical-directory.real.json)

覆盖：

1. 延安大学附属医院
2. 延安市中医医院（北京大学第三医院延安分院）

## 医院与科室来源

### 延安大学附属医院

- 医院信息与学科相关公开页面：
  - [延安大学医学院/附属医院相关页面](https://yxy.yau.edu.cn/info/1027/1091_1.htm)
- 神经内科义诊与专家信息：
  - [延安大学官网新闻](https://www.yau.edu.cn/info/1120/361497.htm)
- 疼痛康复医学科高东梅信息：
  - [延安大学医学院页面](https://yxy.yau.edu.cn/info/2321/27861.htm)

### 延安市中医医院（北京大学第三医院延安分院）

- 推拿康复科与专家信息：
  - [延安市中医医院官方新闻](https://www.yaszyyy.com/xwzx/yydt/1970021341193060354.html)
- 脑病科与专家信息：
  - [延安市中医医院官方新闻](https://www.yaszyyy.com/xwzx/yydt/1996824677820940290.html)
- 运动医学科与专家信息：
  - [延安市中医医院官方新闻](https://www.yaszyyy.com/xwzx/yydt/1968884415308251138.html)
- 庞军相关公开科普信息：
  - [延安市中医医院官方页面](https://www.yaszyyy.com/jkjy/zykp/2004433958502154241.html)

## 整理原则

- 优先使用医院或学校官方站点。
- 优先选择与老年照护高相关的科室：神经内科、康复、脑病、运动医学。
- 医生职称和专长采用公开页面中明确可判断的信息，专长文字做了轻度归纳，便于目录展示。
- 当前这份数据集的目标是竞赛演示与本地化真实目录建设，不作为正式医疗导诊依据。

## 后续扩充建议

下一批最值得补充：

1. 延安市人民医院
2. 延安地区康复相关专科或老年医学相关科室
3. 更多医生条目与门诊信息字段

## 使用说明

当前目录已经通过本地 dry-run 校验。后续在可访问 Docker daemon 的环境中执行：

```powershell
cd D:\03_Study\Desktop\old
docker-compose exec backend npm run medical:directory:import -- --file templates/medical-directory.real.json
```

导入后再通过 `/medical/hospitals`、`/medical/departments`、`/medical/doctors` 验证缓存结果。
