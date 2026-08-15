# dsh-voice-input 🎤

**DeepSeek Harness 语音输入插件** —— 在聊天输入框旁添加一个麦克风按钮，用浏览器 Web Speech API 将语音实时转写为文字并写入输入框，说中文、English、日本語……随你切换。

![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-blue)
![browser](https://img.shields.io/badge/browser-Chrome%2FEdge-brightgreen)

## ✨ 功能

- 🎤 **圆形麦克风按钮**（幽灵样式）：点击开始/停止语音输入，聆听时淡红晕染 + 呼吸光圈 + 图标浮动动画
- 🌐 **8 种识别语言**：中文 / English / 日本語 / 한국어 / Français / Deutsch / Русский / Español
  - 默认自动跟随浏览器界面语言（智能映射：zh-TW → 中文、en-GB → English 等）；下拉框选「自动（跟随浏览器）」可随时恢复跟随
  - 可手动切换，选择会记住（localStorage），刷新不丢；手动选择后输入框旁会标明「手动：…」
  - 聆听中切换语言会自动无缝重启识别；自动模式下浏览器语言变化（languagechange）也会实时跟随
- 📝 **实时转写预览**：聆听时输入框上方显示波形动画 + 实时转写文字（胶囊状态条）
- 🚀 **识别后自动发送**：可选项，勾选后识别结束直接发送消息
- 💬 **智能写回**：识别文字自动追加到输入框草稿（保留已有内容），可修改后再发送
- 🌙 **主题自适应**：全部使用 DSH 主题变量，自动适配亮/暗主题
- ⚠️ **清晰的错误提示**：麦克风权限被拒、无音频设备、网络错误、浏览器不支持等

## 🛠 技术说明

- **纯客户端实现**：浏览器 Web Speech API（`SpeechRecognition` / `webkitSpeechRecognition`），**无需后端服务、无需 API Key**
- **要求 Chrome / Edge**（Firefox 不支持 Web Speech API）；本地访问（localhost/127.0.0.1）为安全上下文，可直接使用
- 以 **DSH 正式 web 插件**（`dsh.client`）形式分发：
  - 浏览器半边 `client.js`：标准 Cordis 插件，经 `exports["./client"]` 出货，由 `dsh.client` 清单声明发现（`platform: "web"`）
  - node 半边 `index.mjs`：空 `apply`，只为让插件进入 host 的 cordis.yml 与 Loader
  - 按钮挂载于 Slot `conversation.input.left`（输入框工具行左侧），状态条挂载于 `conversation.input.dock`（输入卡上方）
  - 通过官方标准接口 `inputActions.setDraft()` / `submit()` 写入输入框，与输入框状态机完全兼容
  - 插件随 DSH 启动自动加载，重启不丢（区别于会话内临时的动态 Cordis 插件）

## 📦 安装

### 方式一：正式 web 插件（推荐）

要求：本机已初始化过 `dsh web`（存在 `$DSH_HOME/profiles/web/`）。

```bash
# 克隆仓库
git clone https://github.com/HuangWeiTao-beep/dsh-voice-input.git
cd dsh-voice-input

# 一键安装：复制插件 → 写入挂载行 → 校验
node install.mjs
```

安装完成后，**刷新浏览器页面**（必要时重启 `dsh web`）即可在输入框工具行看到麦克风按钮。

卸载：删除 `$DSH_HOME/profiles/web/node_modules/dsh-voice-input/`，并从 `$DSH_HOME/profiles/web/cordis.patch.yml` 中移除对应挂载行，重启 `dsh web`。

### 方式二：动态 Cordis 插件（临时体验）

在 DSH 会话中把 [voice-input-plugin/src/voice-input.client.js](voice-input-plugin/src/voice-input.client.js) 的内容作为 `code.client` 提交（`cordis_define` → `cordis_run`）。此方式仅当前会话有效，重启后消失，适合快速试用。

## 🗂 目录结构

```
dsh-voice-input/
├── package.json          # dsh.client 声明（platform: web）+ exports["./client"]
├── client.js             # 浏览器半边：语音输入插件本体（bundle 格式）
├── index.mjs             # node 半边：空 apply（让插件进入 host Loader）
├── install.mjs           # 一键安装脚本
├── README.md
├── LICENSE
└── voice-input-plugin/
    └── src/
        └── voice-input.client.js   # 动态 Cordis 插件版本（旧版，临时体验用）
```

## 🤝 参与建设

欢迎一切形式的贡献：

- 🐛 提 **Issue**：报告 bug、建议新功能（如：双语言并行识别、按住说话、快捷键、设置页）
- 🔧 提 **PR**：改进 UI 样式、优化识别逻辑、补充文档
- 💬 讨论：多语言识别方案（Web Speech API 单会话单语言限制下的最佳实践）

开发建议：修改 `client.js` 后刷新页面即可看到效果（`dsh web` 的开发模式支持客户端插件热更新）；浏览器控制台里插件日志带 `dsh-voice-input` 标识。

## 📜 版本历史

- **v1.0.3**（2026-08-15）：移除输入框旁的常驻语言说明提示（「自动（跟随浏览器）」下拉选项已自带说明）；语言胶囊加宽至完整显示「自动（跟随浏览器）」，选中值与下拉选项统一居中
- **v1.0.2**（2026-08-15）：修复浏览器语言切换后默认识别语言不跟随的问题——新增「自动（跟随浏览器）」选项（可持久化、可随时恢复），聆听中切换/浏览器语言变化均无缝重启识别；另修复切换语言重启后下一轮结果被误丢弃的问题
- **v1.0.1**（2026-08-15）：修复切换识别语言时的偶发竞态（`abort()` 恰在识别自然结束时调用会遗留脏标志，导致下一次识别结果被丢弃）；麦克风按钮补充 `aria-label` / `aria-pressed`，无障碍适配
- **v1.0.0**（2026-08-15）：首个正式版本，以 DSH 正式 web 插件（`dsh.client`）形式分发

## 📜 License

[MIT](LICENSE)
