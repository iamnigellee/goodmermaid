# Codex 任务 E:CI 覆盖增强 + SVG 完整性安全测试

仓库: /Users/nigel/project/bm-m1-e  (worktree, 分支 hermese/m1-r2-ci)
基线: 已含 M1 的安全/语法/ELK 改动(6e96f2f), 736 tests pass。你在此之上新增。
技术栈: bun (已装 1.3.14), tsup, typescript 5.9.x, elkjs 0.11.0, entities 7.0.1。无浏览器测试框架(feature/devDeps 均未装)。

## 任务
增强 `.github/workflows/ci.yml`,并新增一个 SVG 完整性安全测试文件。不破坏本地开发体验。

## 步骤

### E1: 修正 ci.yml
当前 ci.yml 只跑 ubuntu-latest + Bun latest。改为:
- `setup-bun` 的 `bun-version` 从 `latest` 固定为 `1.3.14`(与本地一致,防 ELK/bun API 漂移)。
- 增加 Node.js 测试矩阵,验证 ESM 导入 + 构建产物在 Node 下可用:
  - 用 `strategy.matrix.node` = [18, 20, 22]。
  - 一个 job:matrix.node 用 setup-node + bun install + `bun run build` + 用 **node** 跑一个消费冒烟(`bun x tsc --noEmit` 也要跑)。
  - 保留一个纯 bun job 跑完整 `bun test`。
  - 不引入网络/注册表依赖;bun-install 已有 lockfile。
- 保持可读性,注释说明每步目的。

### E2: 新增 SVG 完整性安全测试
新建 `src/__tests__/svg-integrity.test.ts`(不依赖任何 DOM 库,纯字符串断言):
- 理论:SVG 可能经 `dangerouslySetInnerHTML` 注入页面 → 输出必须是安全的。
- 覆盖:
  1. renderMermaidSVG 各类图(flowchart/state/sequence/class/er/xychart)的输出**不得包含**:`<script`、`onload=`、`onerror=`、`onclick=`、`javascript:`、`<iframe`、`<object`、`<embed`、`<link`、`<form`。
  2. 恶意主题参数(复用并扩展 sanitize 测试的姿势):bg/fg/font 传 `"><script>alert(1)</script>`、`onload=...` 等,断言输出仍无危险标记且能正常生成 `<svg`。
  3. 输出的 `<style>` 块必须能被正确定界:统计 `<style>` 与 `</style>` 数量相等,且无 `</style>` 内夹带 `<svg`/`<script`。
  4. 所有 `style="..."` 属性内部不得出现未转义的 `"`(即不能逃出属性)。
- 复用已存在的 `src/sanitize.ts` 的导出(可 import 测试其行为),但测试主体走 `renderMermaidSVG` 端到端,别只测单函数。

### E3: 浏览器端冒烟(务实、轻量)
仓库无浏览器框架且目标是 M1 补丁。**不要**引入 playwright/puppeteer(那是 M2+ 的事)。务实方案:
- 在 ci.yml 里增加一个 job,用 `bun test` 在真实浏览器 DOM 不可行时,改为验证构建出的 ESM 产物 `dist/index.js` 能在 **Node ESM** 下 import 并渲染(覆盖 setuptup-node 矩阵已做)。
- 若你判断值得,可在 `src/__tests__/svg-integrity.test.ts` 加一个"SVG 可被 DOMParser 解析且根元素是 svg"的逻辑断言(用 Node 内置的简单 XML 解析,避免引入 DOM 库)。但禁止为此新增 heavy dependency。
- 不要在 ci.yml 里加会失败/需要浏览器二进制的东西——保持 CI 绿。

## 验收
- `bun test` 全绿(736 + 新增的 integrity 测试)。
- `bunx tsc --noEmit` exit 0。
- ci.yml 语法正确(可读、矩阵合理)。
- 不改 src/ 生产源码(除非 integrity 测试暴露了真实安全 bug,此时允许最小修复并写明)。若 sanitize 有缺口导致 integrity 测试不过,修复它。
- 不开 PR、不联网。

## 汇报
- ci.yml 改成什么样(矩阵/job 列表)。
- 新增 integrity 测试覆盖的图表类型数、危险模式清单。
- 是否发现并修复了 sanitize 的额外安全缺口(如有,列明)。
- `bun test` 最终 pass 数。
