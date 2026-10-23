# WL 篇章数据

`public/data/pjsk_wl_chapters.json` 按活动分组，篇章数组顺序就是显示顺序。时间统一为 UTC+8 的 `年/月/日 时:分:秒` 字符串；界面只显示到分钟。

```json
[
  {
    "event_id": 112,
    "chapters": [
      {
        "character": "朝比奈真冬",
        "start_date": "2023/11/8 19:00:00",
        "end_date": "2023/11/11 18:59:59"
      }
    ]
  }
]
```

- `event_id`：关联活动表中的活动编号。
- `chapters`：按实际开启顺序排列，不再单独保存篇章编号。
- `character`：使用角色表的中文姓名；无角色的终章为空字符串。
- `start_date`、`end_date`：篇章开始和计分结束时间，保留秒数以准确校验相邻篇章。

不保存角色数字 ID、角色类型或毫秒时间戳。

## 自动同步

现有 `sync-external-data.yml` 的 `Sync WL chapter schedules` 步骤通过 `npm run sync:wl-other` 拉取独立的上游表 [worldBlooms.json](https://sekai-world.github.io/sekai-master-db-diff/worldBlooms.json)，结合本站角色表转换并写回此文件。脚本保存在私有仓库 `pjsk-planner-sync-private/scripts/sync-wl-chapters-other-source.mjs`，CI 与其他同步脚本一起安装到本站忽略的 `sync-scripts/`；转换与校验复用前端的 `worldLinkChapters.js`。该表提供原活动表无法推导的角色篇章顺序与时间；浏览器只加载本站转换后的 JSON。随现有定时任务在每日 UTC+8 08:00、11:07 运行，也可手动触发；本地修改需要发布后才会由远端工作流执行。

本地可用 `npm run sync:wl-other:dry` 只预览，不改写文件。脚本也支持 `--source-file`、`--characters-file` 和 `--output-file` 进行离线验证；普通运行只在内容变化时写入。

同步输入字段与用途：

| 来源字段 | 用途 |
| --- | --- |
| `eventId` | 活动关联，写入 `event_id` |
| `chapterNo` | 校验并排序篇章，不写入结果 |
| `gameCharacterId` | 通过 `pjsk_characters.json` 的 `id` 找到 `zh_name`，写入 `character` |
| `worldBloomChapterType` | 识别无角色的终章，仅在转换时使用 |
| `chapterStartAt` | 转换为 UTC+8 字符串 `start_date` |
| `aggregateAt` | 转换为 UTC+8 字符串 `end_date` |

`chapterEndAt` 比计分结束晚十分钟，不用于结束时间。未知角色、重复序号或非连续时间会令同步失败，避免覆盖现有有效资料。

前端仅在打开 WL 活动详情时加载文件，验证时间与顺序后缓存；加载失败可以重试。此文件参与公共数据版本计算，不增加首页必需数据请求。
