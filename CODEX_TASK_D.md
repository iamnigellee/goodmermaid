# Codex 任务 D:README 示例自动测试

仓库: /Users/nigel/project/bm-m1-d  (worktree, 分支 hermese/m1-r2-readme-tests)
基线: 已含 M1 的安全/语法/ELK 改动(6e96f2f), 736 tests pass。你在此之上新增。

## 任务
把 README.md 中所有可执行的 Mermaid 渲染示例变成自动化测试,保证文档示例永不失联。

## 步骤
1. 读取本仓库 README.md。
2. 找出所有调用渲染 API 的示例:
   - `renderMermaidSVG(...)`  — SVG
   - `renderMermaidASCCI(...)` / `renderMermaidASCII(...)` — ASCII
   - `renderMermaidSVGAsync(...)` — async SVG
   - 以及任何 `from 'beautiful-mermaid'` 的示例代码块
3. 从这些代码块中提取 Mermaid 源文本(传给渲染 API 的模板字符串内容)。
4. 新建测试文件 `src/__tests__/readme-examples.test.ts`,对**每一个**提取到的 Mermaid 源文本:
   - 断言 `renderMermaidSVG` 能成功渲染(返回 SVGG 字符串, 不抛错)
   - 断言输出的 SVG 至少包含 `<svg`,且不含 `<script`、`onload`、`onerror`(安全基线)
   - 若示例是 ASCII,断言返回非空字符串
   - 若示例用了 `bg: 'var(--...)'` 这类 CSS 变量,保留原样测试(我们的 sanitize 应允许 var(--bg) 等)
5. 注意:代码块里有 TypeScript/JSX 包装(如 React 组件、useMemo),你只提取**传入渲染 API 的 Mermaid 模板字符串**,用它们调 renderMermaidSVG 测试即可。不要试图执行 JSX/React。
6. 用一个清晰的 `describe('README examples')` + 每个示例一个 `it()`。测试名写明来自 README 哪一段(可用行号或章节标题)。

## 验收
- `bun test` 全绿(736 + 新增)。
- `bunx tsc --noEmit` exit 0。
- 覆盖 README 中**所有**能提取到 Mermaid 源文本的示例(至少 5 个)。若某示例语法特殊导致 renderMermaidSVG 刻意不支持(如实测无法渲染),在测试里显式标记 `it.skip` 并在文件顶部注释说明原因,不要删。
- 不改任何 src/ 源码、不改 README。
- 不开 PR、不联网。

## 汇报
JSON/表格:提取到几个示例、每个示例的源文本片段 + 测试名 + 通过/跳过,跳过的原因。以及 `bun test` 报的最终 pass 数。
