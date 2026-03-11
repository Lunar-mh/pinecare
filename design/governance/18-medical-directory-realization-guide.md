# 医疗目录真实化专项操作手册

## 1. 目标

医疗目录真实化的目标不是立刻把整条医疗 live 平台全部接满，而是先把最容易被评审质疑的那一层做真：医院、科室、医生目录不再依赖幻想数据，而是切换成你人工整理的真实目录数据，并灌入后端缓存。

当前后端已经具备正确的消费路径：

1. 先查缓存 `medical_directory_cache`
2. 有 live 配置时尝试调用上游 `medicalApiService`
3. live 不可用时退到公开整理目录 `publicMedicalDirectory.js`

所以这次最优做法不是改接口，而是把“真实目录数据导入缓存”做成标准流程。

## 2. 这次新增的工具

### 2.1 导入脚本

新增脚本：[importMedicalDirectory.js](/D:/03_Study/Desktop/old/backend/scripts/importMedicalDirectory.js)

作用：

- 读取一个 JSON 数据集
- 校验医院、科室、医生三层关系
- dry-run 预检查
- 正式导入到 `medical_directory_cache`
- 生成导入报告

### 2.2 模板文件

模板路径：[medical-directory.template.json](/D:/03_Study/Desktop/old/backend/templates/medical-directory.template.json)

你后面只需要复制这份模板，替换成你整理好的真实医院、科室、医生数据即可。

### 2.3 便捷命令

已新增 npm script：

```powershell
cd D:\03_Study\Desktop\old\backend
npm run medical:directory:import -- --dry-run
```

## 3. 数据格式要求

JSON 顶层固定三块：

- `hospitals`
- `departments`
- `doctors`

### 3.1 hospitals

每条医院数据至少要有：

- `id`
- `name`
- `level`
- `city`

### 3.2 departments

每条科室数据至少要有：

- `id`
- `hospitalId`
- `name`

### 3.3 doctors

每条医生数据至少要有：

- `id`
- `hospitalId`
- `departmentId`
- `name`
- `title`
- `specialty`

## 4. 最推荐的数据采集方式

按竞赛阶段最务实的做法，建议这样整理：

1. 先选 2 到 5 家与你项目定位贴近的医院。
2. 每家医院只选 2 到 4 个与养老高度相关的科室。
3. 每个科室先整理 2 到 5 位医生即可。

最适合你项目的科室优先级：

1. 老年医学科
2. 康复医学科
3. 神经内科
4. 心内科
5. 内分泌科
6. 全科医学科

这套数据量对比赛已经够用，而且非常贴题。

## 5. 建议的数据来源

优先级固定为：

1. 医院官网公开页面
2. 医院挂号平台公开页面
3. 医院官方公众号公开资料
4. 地方卫健委公开资料

不建议直接复制来源不清的聚合站内容作为主来源。

## 6. 具体操作步骤

### 6.1 复制模板

```powershell
cd D:\03_Study\Desktop\old\backend
Copy-Item templates\medical-directory.template.json templates\medical-directory.real.json
```

然后编辑：

[medical-directory.real.json](/D:/03_Study/Desktop/old/backend/templates/medical-directory.real.json)

### 6.2 填入真实目录

建议先做一个最小版本：

- 2 家医院
- 3 个科室
- 6 位医生

先保证结构和关系正确，再扩量。

### 6.3 dry-run 校验

```powershell
cd D:\03_Study\Desktop\old

docker-compose exec backend npm run medical:directory:import -- --file templates/medical-directory.real.json --dry-run
```

如果通过，你会看到：

- `status: ready`
- `counts` 显示医院/科室/医生数量
- 报告文件输出到：
  [latest-import-report.json](/D:/03_Study/Desktop/old/backend/generated/medical-directory/latest-import-report.json)

### 6.4 正式导入

```powershell
cd D:\03_Study\Desktop\old

docker-compose exec backend npm run medical:directory:import -- --file templates/medical-directory.real.json
```

成功后，你想看到：

- `status: imported`
- `importedAt` 有时间戳

## 7. 导入后怎么验证

### 7.1 看报告文件

查看：

[latest-import-report.json](/D:/03_Study/Desktop/old/backend/generated/medical-directory/latest-import-report.json)

### 7.2 看接口返回

最少验证这四个接口：

- `GET /medical/hospitals`
- `GET /medical/departments?hospitalId=...`
- `GET /medical/doctors?departmentId=...`
- `GET /medical/doctors/:doctorId`

你期待看到：

- `source` 优先变成 `cache`
- 不再依赖 `public_curated_dataset`
- 数据内容已经是你整理的真实目录

### 7.3 看后台系统诊断

虽然医疗目录缓存不一定会把 `medical` 直接显示为 `live`，但你至少要确保：

- 目录接口能返回真实整理数据
- `fallbackUsed` 降低
- `diagnostics` 可解释

## 8. 实战建议

### 8.1 第一步不要追求全国范围

当前最好的策略不是一口气导全国 3A 医院，而是先做“与你项目场景强相关”的一小批：

- 上海或你学校所在城市 2 到 5 家医院
- 与老年照护强相关的重点科室
- 适量医生样本

### 8.2 目录真实化完成后，再做 live 平台

顺序不要反过来。先把目录缓存做真，再去碰：

- 在线咨询
- 预约
- 报告同步

这样即使 live 平台暂时没批下来，你的医疗模块展示也已经很硬了。

### 8.3 保留公开来源记录

建议你给自己额外做一个来源表，哪怕只是 Excel：

- 医院名称
- 来源网址
- 抓取日期
- 备注

比赛答辩时，如果老师问“这些医生和医院是真实的吗”，你能立刻拿出来源依据。

## 9. 推荐你现在就执行的命令

先只做 dry-run：

```powershell
cd D:\03_Study\Desktop\old
Copy-Item backend\templates\medical-directory.template.json backend\templates\medical-directory.real.json
```

编辑完以后执行：

```powershell
docker-compose exec backend npm run medical:directory:import -- --file templates/medical-directory.real.json --dry-run
```

确认没问题再正式导入：

```powershell
docker-compose exec backend npm run medical:directory:import -- --file templates/medical-directory.real.json
```

## 10. 你接下来最好的推进方式

建议你按这个节奏做：

1. 先整理 2 家医院、3 个科室、6 位医生。
2. 用导入脚本做 dry-run。
3. 正式导入。
4. 用 `/medical/*` 接口截图留证。
5. 再逐步扩到 5 家医院左右。

这样我们可以很快把“医疗目录真实化”从想法变成答辩材料里的硬证据。
