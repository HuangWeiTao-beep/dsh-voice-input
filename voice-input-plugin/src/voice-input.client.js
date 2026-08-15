// ============================================================================
// dsh-voice-input — DeepSeek Harness 语音输入插件（客户端代码）
//
// 说明：
//   本文件是 DSH 动态 Cordis 插件的 Client half（code.client），
//   纯浏览器实现，基于 Web Speech API（SpeechRecognition），无需后端。
//   在 DSH 会话中通过 cordis_define(cordis) 提交本文件内容即可运行。
//
// 要求：
//   - Chrome / Edge 浏览器（Firefox 不支持 Web Speech API）
//   - 需要麦克风权限（浏览器会弹出授权请求）
//
// 版本历史：
//   v1  基础版：emoji 按钮 + 语言切换 + 实时转写 + 自动发送
//   v2  美化版：SVG 图标、渐变聆听态、胶囊状态条、波形动画
//   v3  圆形按钮版
//   v4  自动语言版（跟随浏览器语言，移除切换框）
//   v5  增加语言说明提示
//   v6  恢复语言切换 + localStorage 记忆选择
//   v7  缩短提示，修复工具行重叠
//   v8  幽灵样式按钮（去除常驻圆边框）
//   v9  聆听态红色调淡（淡红晕染底 + 深红图标）
// ============================================================================

const LANGS = [
  ['zh-CN', '中文'],
  ['en-US', 'English'],
  ['ja-JP', '日本語'],
  ['ko-KR', '한국어'],
  ['fr-FR', 'Français'],
  ['de-DE', 'Deutsch'],
  ['ru-RU', 'Русский'],
  ['es-ES', 'Español'],
]
const AUTO_LANG = 'auto' // 哨兵值：表示"跟随浏览器界面语言"，可被记住（localStorage）

// 自动检测识别语言：跟随浏览器界面语言，并做智能映射（zh-TW → zh-CN、en-GB → en-US …）
function detectLang() {
  let candidates = []
  try {
    if (typeof navigator !== 'undefined') {
      if (navigator.languages && navigator.languages.length) candidates = Array.from(navigator.languages)
      else if (navigator.language) candidates = [navigator.language]
    }
  } catch (e) { /* ignore */ }
  const byBase = {
    zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR',
    fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU', es: 'es-ES',
  }
  for (const raw of candidates) {
    const code = String(raw).toLowerCase()
    const exact = LANGS.find((p) => p[0].toLowerCase() === code)
    if (exact) return exact[0]
    const byBaseLang = byBase[code.split('-')[0]]
    if (byBaseLang) return byBaseLang
  }
  return 'zh-CN'
}

// 读取上次的语言偏好：手动选择的语言或"自动"都会被记住；没有记录则默认跟随浏览器
function loadSavedLang() {
  try {
    const saved = window.localStorage.getItem('dsh-voice-input-lang')
    if (saved === AUTO_LANG || (saved && LANGS.some((p) => p[0] === saved))) return saved
  } catch (e) { /* ignore */ }
  return AUTO_LANG
}

const CSS = `
.dyn-vi-row { display: inline-flex; align-items: center; gap: 6px; }

/* 麦克风按钮（正圆形、幽灵样式：无常驻边框） */
.dyn-vi-mic {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, color .18s ease, transform .12s ease, box-shadow .18s ease;
}
.dyn-vi-mic:hover:not(:disabled) {
  color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-layer-1);
  transform: translateY(-1px);
}
.dyn-vi-mic:active:not(:disabled) { transform: scale(.92); }
.dyn-vi-mic:disabled { opacity: .4; cursor: not-allowed; }
.dyn-vi-mic[data-listening="true"] {
  border-color: transparent;
  background: rgba(244, 63, 94, .16);
  color: #e11d48;
  animation: dyn-vi-pulse 1.4s ease-out infinite;
}
@keyframes dyn-vi-pulse {
  0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, .35); }
  70% { box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}
.dyn-vi-mic[data-listening="true"] .dyn-vi-icon { animation: dyn-vi-bob .9s ease-in-out infinite; }
@keyframes dyn-vi-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }

/* 语言选择（幽灵胶囊） */
.dyn-vi-lang {
  height: 26px; max-width: 84px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px; padding: 0 6px;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, color .18s ease;
}
.dyn-vi-lang:hover {
  border-color: var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* 按钮旁的语言说明提示（短文案，完整说明在悬停提示里） */
.dyn-vi-hint {
  font-size: 11px;
  line-height: 1;
  color: var(--dsw-alias-label-secondary);
  opacity: .8;
  white-space: nowrap;
  user-select: none;
}

.dyn-vi-mic:focus-visible, .dyn-vi-lang:focus-visible, .dyn-vi-stop:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px;
}

/* 状态条（胶囊） */
.dyn-vi-status {
  display: flex; align-items: center; justify-content: center;
  gap: 10px;
  width: fit-content; max-width: 100%;
  margin: 6px auto 0;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 2px 14px rgba(0, 0, 0, .08);
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
}
.dyn-vi-status[data-error="true"] {
  color: var(--dsw-alias-state-error-primary);
  border-color: rgba(239, 68, 68, .35);
  background: rgba(239, 68, 68, .08);
}
.dyn-vi-wave { display: inline-flex; align-items: center; gap: 2.5px; height: 14px; flex: none; }
.dyn-vi-wave span { display: block; width: 3px; border-radius: 2px; background: var(--dsw-alias-state-error-primary); animation: dyn-vi-wave 1s ease-in-out infinite; }
.dyn-vi-wave span:nth-child(2) { animation-delay: .15s; }
.dyn-vi-wave span:nth-child(3) { animation-delay: .3s; }
@keyframes dyn-vi-wave { 0%, 100% { height: 5px; } 50% { height: 14px; } }
.dyn-vi-interim { color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40vw; }
.dyn-vi-langtag { font-size: 11px; color: var(--dsw-alias-label-secondary); opacity: .85; flex: none; }
.dyn-vi-stop {
  height: 24px; padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px; cursor: pointer; flex: none;
  transition: border-color .15s ease, color .15s ease, background .15s ease;
}
.dyn-vi-stop:hover {
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
  background: rgba(239, 68, 68, .08);
}
.dyn-vi-autosend {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--dsw-alias-label-secondary);
  cursor: pointer; user-select: none; flex: none;
}
.dyn-vi-autosend input { accent-color: var(--dsw-alias-brand-primary); cursor: pointer; margin: 0; }
`

// 精致 SVG 图标（lucide 风格描边）
const svgAttrs = {
  viewBox: '0 0 24 24',
  width: 14, height: 14,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
const MicIcon = () => React.createElement('svg', svgAttrs,
  React.createElement('path', { key: 'a', d: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z' }),
  React.createElement('path', { key: 'b', d: 'M19 11a7 7 0 0 1-14 0' }),
  React.createElement('path', { key: 'c', d: 'M12 18v4' }),
)
const AlertIcon = () => React.createElement('svg', svgAttrs,
  React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 10 }),
  React.createElement('line', { key: 'l1', x1: 12, y1: 8, x2: 12, y2: 12 }),
  React.createElement('line', { key: 'l2', x1: 12, y1: 16, x2: 12.01, y2: 16 }),
)

return {
  name: 'voice-input',
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    // ---- 微型共享 store（模块级，供两个 Slot 条目订阅） ----
    const listeners = new Set()
    let store = { listening: false, interim: '', final: '', error: null, lang: loadSavedLang(), autoSend: false }
    const setStore = (patch) => {
      store = Object.assign({}, store, patch)
      for (const fn of Array.from(listeners)) fn()
    }
    const langLabel = () => {
      if (store.lang === AUTO_LANG) {
        const p = LANGS.find((x) => x[0] === detectLang())
        return p ? '自动（' + p[1] + '）' : '自动'
      }
      const p = LANGS.find((x) => x[0] === store.lang)
      return p ? p[1] : store.lang
    }
    // 实际送入 SpeechRecognition 的语言码："auto" 解析为浏览器当前语言
    const resolveLang = () => (store.lang === AUTO_LANG ? detectLang() : store.lang)

    // ---- 识别器状态 ----
    let recognition = null
    let failed = false
    let manualAbort = false
    let discardNext = false
    let restartAfterEnd = false
    let latestDraft = ''
    let latestActions = null
    let capTimer = null

    const describeError = (code) => {
      switch (code) {
        case 'not-allowed':
        case 'service-not-allowed':
          return '麦克风权限被拒绝，请在浏览器地址栏允许麦克风访问后重试'
        case 'no-speech':
          return '未检测到语音，请靠近麦克风重试'
        case 'audio-capture':
          return '未找到可用的麦克风设备'
        case 'network':
          return '语音识别服务网络错误，请检查网络后重试'
        case 'aborted':
          return '语音识别已取消'
        case 'language-not-supported':
          return '当前浏览器不支持所选识别语言'
        default:
          return '语音识别失败' + (code ? '（' + code + '）' : '')
      }
    }

    // 把识别结果写入输入框（追加到现有草稿，可自动发送）
    const commitPending = () => {
      const text = (store.final + store.interim).trim()
      if (!text) return
      const actions = latestActions
      if (!actions) return
      actions.setDraft(latestDraft ? latestDraft.trimEnd() + ' ' + text : text)
      if (store.autoSend) actions.submit()
    }

    const ensureRecognition = () => {
      if (recognition) return recognition
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) {
        setStore({ error: '当前浏览器不支持语音识别，请使用 Chrome 或 Edge 打开本页面' })
        return null
      }
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.onresult = (event) => {
        let final = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]
          const t = r && r[0] ? r[0].transcript : ''
          if (r.isFinal) final += t
          else interim += t
        }
        setStore({ final: store.final + final, interim })
      }
      rec.onerror = (event) => {
        if (event && event.error === 'aborted' && manualAbort) return
        failed = true
        setStore({ listening: false, error: describeError(event && event.error) })
      }
      rec.onend = () => {
        if (capTimer) { capTimer(); capTimer = null }
        if (restartAfterEnd) {
          // 语言切换后的重启：清掉切换时留下的标志，新会话按正常流程提交结果
          restartAfterEnd = false
          discardNext = false
          manualAbort = false
          startListening()
          return
        }
        if (discardNext) { discardNext = false; manualAbort = false; failed = false; setStore({ listening: false, interim: '', final: '' }); return }
        manualAbort = false
        if (!failed) commitPending()
        failed = false
        setStore({ listening: false, interim: '', final: '' })
      }
      recognition = rec
      return rec
    }

    const startListening = () => {
      const rec = ensureRecognition()
      if (!rec) return
      try { rec.lang = resolveLang() } catch (e) { /* ignore */ }
      try {
        rec.start()
      } catch (e) {
        setStore({ error: '无法启动语音识别：' + (e && e.message ? e.message : '未知错误') })
        return
      }
      setStore({ listening: true, interim: '', final: '', error: null })
      if (capTimer) capTimer()
      capTimer = ctx.timer.timeout(() => { if (store.listening) stopListening() }, 60000)
    }

    const stopListening = () => {
      if (!store.listening || !recognition) return
      manualAbort = false
      try { recognition.stop() } catch (e) { setStore({ listening: false }) }
    }

    const toggleListening = () => {
      if (store.listening) stopListening()
      else startListening()
    }

    const changeLang = (lang) => {
      if (lang === store.lang) return
      setStore({ lang })
      try { window.localStorage.setItem('dsh-voice-input-lang', lang) } catch (e) { /* ignore */ }
      if (store.listening && recognition) {
        discardNext = true
        manualAbort = true
        restartAfterEnd = true
        try { recognition.abort() } catch (e) {
          // abort 抛异常 = 识别恰好已自然结束：复位全部标志，
          // 避免下一次识别被误丢弃 / 意外重启 / 吞掉后续 abort 错误。
          restartAfterEnd = false
          discardNext = false
          manualAbort = false
        }
      }
    }

    // ---- React 胶水 ----
    const useVoiceStore = () => {
      const [snap, setSnap] = React.useState(store)
      React.useEffect(() => {
        const fn = () => setSnap(store)
        listeners.add(fn)
        return () => { listeners.delete(fn) }
      }, [])
      return snap
    }

    const VoiceMicEntry = (props) => {
      const s = useVoiceStore()
      const draft = (props.input && props.input.draft) || ''
      React.useEffect(() => { latestDraft = draft }, [draft])
      React.useEffect(() => { if (props.inputActions) latestActions = props.inputActions }, [props.inputActions])
      const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
      const mic = React.createElement('button', {
        type: 'button',
        className: 'dyn-vi-mic',
        'data-listening': s.listening,
        disabled: !supported,
        'aria-label': supported
          ? (s.listening ? '停止语音输入' : '开始语音输入')
          : '语音输入不可用（当前浏览器不支持语音识别）',
        'aria-pressed': s.listening,
        title: supported
          ? (s.listening ? '点击停止语音输入（识别语言：' + langLabel() + '）' : '点击开始语音输入（识别语言：' + langLabel() + '）')
          : '当前浏览器不支持语音识别（请使用 Chrome / Edge）',
        onClick: toggleListening,
      }, React.createElement('span', { className: 'dyn-vi-icon' }, React.createElement(MicIcon)))
      const opts = [React.createElement('option', { key: AUTO_LANG, value: AUTO_LANG }, '自动（跟随浏览器）')]
        .concat(LANGS.map((pair) => React.createElement('option', { key: pair[0], value: pair[0] }, pair[1])))
      const sel = React.createElement('select', {
        className: 'dyn-vi-lang',
        value: s.lang,
        title: '识别语言（会记住选择；选「自动」则始终跟随浏览器界面语言）',
        onChange: (e) => changeLang(e.target.value),
      }, opts)
      // 短文案常驻；完整说明放在悬停提示里
      const hint = React.createElement('span', {
        className: 'dyn-vi-hint',
        title: '语音输入 · 默认语言与浏览器显示语言一致，可手动切换；选「自动」恢复跟随浏览器',
      }, s.lang === AUTO_LANG ? '默认语言同浏览器' : '手动：' + langLabel())
      return React.createElement('div', { className: 'dyn-vi-row' }, mic, sel, hint)
    }

    const VoiceStatusDock = (props) => {
      const s = useVoiceStore()
      React.useEffect(() => {
        if (!s.error) return
        const d = ctx.timer.timeout(() => setStore({ error: null }), 6000)
        return d
      }, [s.error])
      if (!s.listening && !s.error) return null
      if (s.error && !s.listening) {
        return React.createElement('div', { className: 'dyn-vi-status', 'data-error': 'true' },
          React.createElement(AlertIcon),
          React.createElement('span', null, s.error))
      }
      const live = s.final + s.interim
      const wave = React.createElement('span', { className: 'dyn-vi-wave' },
        React.createElement('span', { key: 'a' }),
        React.createElement('span', { key: 'b' }),
        React.createElement('span', { key: 'c' }))
      const stopBtn = React.createElement('button', { type: 'button', className: 'dyn-vi-stop', onClick: stopListening }, '停止')
      const autoSend = React.createElement('label', { className: 'dyn-vi-autosend' },
        React.createElement('input', {
          type: 'checkbox',
          checked: s.autoSend,
          onChange: (e) => setStore({ autoSend: e.target.checked }),
        }),
        React.createElement('span', null, '识别后自动发送'))
      return React.createElement('div', { className: 'dyn-vi-status' },
        wave,
        React.createElement('span', null, '聆听中…'),
        React.createElement('span', { className: 'dyn-vi-langtag' }, langLabel()),
        live ? React.createElement('span', { className: 'dyn-vi-interim' }, live) : null,
        stopBtn,
        autoSend)
    }

    // ---- 自动模式实时跟随浏览器语言（浏览器触发 languagechange 时无缝重启识别） ----
    const onBrowserLangChange = () => {
      if (store.lang !== AUTO_LANG || !store.listening || !recognition) return
      discardNext = true
      manualAbort = true
      restartAfterEnd = true
      try { recognition.abort() } catch (e) {
        restartAfterEnd = false
        discardNext = false
        manualAbort = false
      }
    }
    try { window.addEventListener('languagechange', onBrowserLangChange) } catch (e) { /* ignore */ }

    // ---- 生命周期 ----
    ctx.effect(() => styles.insert(CSS))
    ctx.effect(() => () => {
      try { window.removeEventListener('languagechange', onBrowserLangChange) } catch (e) { /* ignore */ }
      if (capTimer) capTimer()
      if (recognition) {
        manualAbort = true
        try { recognition.abort() } catch (e) { /* ignore */ }
      }
      listeners.clear()
    })

    const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!supported) setStore({ error: '当前浏览器不支持语音识别，请使用 Chrome 或 Edge 打开本页面' })

    slots.inject('conversation.input.left', () => slots.register(
      { name: 'conversation.input.left', id: 'voice-input', order: 0, label: '语音输入' },
      (props) => React.createElement(VoiceMicEntry, props),
    ))
    slots.inject('conversation.input.dock', () => slots.register(
      { name: 'conversation.input.dock', id: 'voice-input-status', order: 0, label: '语音输入状态' },
      (props) => React.createElement(VoiceStatusDock, props),
    ))
  },
}
