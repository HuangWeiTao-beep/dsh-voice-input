# dsh-voice-input 🎤

**DeepSeek Harness 语音输入插件** —— 在聊天输入框旁添加一个麦克风按钮，用浏览器 Web Speech API 将语音实时转写为文字并写入输入框，说中文、English、日本語……随你切换。

![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-blue)
![browser](https://img.shields.io/badge/browser-Chrome%2FEdge-brightgreen)

## ✨ 功能

- 🎤 **圆形麦克风按钮**（幽灵样式）：点击开始/停止语音输入，聆听时淡红晕染 + 呼吸光圈 + 图标浮动动画
- 🌐 **8 种识别语言**：中文 / English / 日本語 / 한국어 / Français / Deutsch / Русский / Español
  - 默认自动跟随浏览器界面语言（智能映射：zh-TW → 中文、en-GB → English 等）
  - 可手动切换，选择会记住（localStorage），刷新不丢
  - 聆听中切换语言会自动无缝重启识别
- 📝 **实时转写预览**：聆听时输入框上方显示波形动画 + 实时转写文字（胶囊状态条）
- 🚀 **识别后自动发送**：可选项，勾选后识别结束直接发送消息
- 💬 **智能写回**：识别文字自动追加到输入框草稿（保留已有内容），可修改后再发送
- 🌙 **主题自适应**：全部使用 DSH 主题变量，自动适配亮/暗主题
- ⚠️ **清晰的错误提示**：麦克风权限被拒、无音频设备、网络错误、浏览器不支持等

## 🛠 技术说明

- **纯客户端实现**：浏览器 Web Speech API（`SpeechRecognition` / `webkitSpeechRecognition`），**无需后端服务、无需 API Key**
- **要求 Chrome / Edge**（Firefox 不支持 Web Speech API）；本地访问（localhost/127.0.0.1）为安全上下文，可直接使用
- 基于 DSH 动态 Cordis 插件机制：
  - 按钮挂载于 Slot `conversation.input.left`（输入框工具行左侧）
  - 状态条挂载于 Slot `conversation.input.dock`（输入卡上方）
  - 通过官方标准接口 `inputActions.setDraft()` / `submit()` 写入输入框，与输入框状态机完全兼容
  - 使用 `inject: ['timer']` 管理超时/自动清理，所有副作用随插件卸载自动回收

## 📦 使用

### 方式一：动态 Cordis 插件（当前形式）

在 DSH 会话中把 [voice-input-plugin/src/voice-input.client.js](voice-input-plugin/src/voice-input.client.js) 的内容作为 `code.client` 提交：

1. `cordis_define`（`kind: new`，idPrefix 如 `voic`）
2. `cordis_run` 激活
3. 批准后，输入框工具行左侧出现麦克风按钮 🎤

### 方式二：接入 `dsh.client` web 插件机制（正式分发）

> 当前版本以动态插件形式运行（进程内临时加载）。如需作为可分发、可安装的正式插件，可在此基础上接入 DSH 的 `dsh.client` 客户端插件表机制（clientModules 服务增量扫描 + bundle 路由），欢迎贡献者实现并提交 PR。

## 🗂 目录结构

```
dsh-voice-input/
├── README.md
├── LICENSE
└── voice-input-plugin/
    └── src/
        └── voice-input.client.js   # 插件完整客户端代码（v9）
```

## 🤝 参与建设

欢迎一切形式的贡献：

- 🐛 提 **Issue**：报告 bug、建议新功能（如：双语言并行识别、按住说话、快捷键、设置页）
- 🔧 提 **PR**：改进 UI 样式、优化识别逻辑、补充文档
- 💬 讨论：多语言识别方案（Web Speech API 单会话单语言限制下的最佳实践）

开发建议：在 DSH 会话中加载插件后，用浏览器的开发者工具检查控制台（插件日志带 `[cordis:插件ID]` 前缀）。

## 📜 License

[MIT](LICENSE)
