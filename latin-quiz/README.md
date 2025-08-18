# 拉丁语冲刺测验站点（GitHub Pages 版）

这是一个零依赖、可直接部署到 GitHub Pages 的小型测验网站。支持：
- 选择题（单选/多选）、判断题、填空题
- 练习模式（即时反馈）与测试模式（最后统一反馈）
- 错题重练、结果导出（JSON）
- 本地保存进度（同一浏览器）

## 目录结构
```
/
├── index.html
├── styles.css
├── app.js
└── data/
    ├── packs.json
    └── latin_week1.json
```

## 如何部署到 GitHub Pages
1. 将以上文件复制到你的仓库（例如 `Revision/latin-quiz/`）。
2. 确保该仓库或主仓库开启 GitHub Pages：
   - Settings → Pages → Branch 选择 `main`（或 `gh-pages`）并保存。
   - 如果你使用的是 `vivianewan.github.io/Revision` 路径，直接把文件放到 `Revision` 仓库即可通过 `https://vivianewan.github.io/Revision/latin-quiz/` 访问。
3. 等待几分钟，访问你对应的 URL。

## 如何新增题库
1. 在 `data/` 下新增一个 JSON 文件（例如 `latin_week2.json`）。
2. 打开 `data/packs.json`，追加一行：
```json
[
  {"id":"latin_week1","title":"Latin Week 1 基础（示例）","path":"data/latin_week1.json"},
  {"id":"latin_week2","title":"Latin Week 2 句法扩展","path":"data/latin_week2.json"}
]
```
3. 刷新网页即可在下拉菜单看到新的题库。

### 题库 JSON 模板
```json
{
  "meta": {
    "id": "latin_weekX",
    "title": "Latin Week X 标题",
    "description": "本周学习目标…"
  },
  "questions": [
    {
      "id": "Q1",
      "type": "mcq",
      "question": "题干",
      "choices": ["A","B","C","D"],
      "answer": [1],               // 正确选项索引（从0开始）。多选题提供多个索引。
      "explanation": "解析...",
      "correct_feedback": "可选：答对提示",
      "incorrect_feedback": "可选：答错提示"
    },
    {
      "id": "Q2",
      "type": "truefalse",
      "question": "判断题题干",
      "answer": true,
      "explanation": "解析..."
    },
    {
      "id": "Q3",
      "type": "fill",
      "question": "填空题题干",
      "answer_text": ["参考答案1","参考答案2"],
      "explanation": "解析..."
      // 可选：使用正则答案
      // "answer_regex": "^the girls?$"
    }
  ]
}
```

## 技巧
- 填空题采用**大小写不敏感**、**忽略重音/变音**、**自动去除常见冠词**与标点的宽松匹配，更贴合实际表达。
- 若需要严格匹配，建议提供 `answer_regex`。
- 题量建议 10–20 道一组，保证反馈及时与学习动力。

祝学习顺利！
