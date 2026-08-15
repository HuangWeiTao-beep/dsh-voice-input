#!/usr/bin/env node
// dsh-voice-input 一键安装脚本
//
// 用法：
//   node install.mjs                 # 装到 $DSH_HOME/profiles/web
//   node install.mjs --profile web   # 指定 profile
//   node install.mjs --home <dir>    # 覆盖 DSH_HOME（测试用）
//
// 唯一默认通路，无任何可选项：复制插件 → 写挂载行 → 校验。
// 幂等：重复执行不会重复写 patch、不会重复复制。

import { existsSync, readFileSync, writeFileSync, cpSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const args = process.argv.slice(2)
function opt(name, def) {
  const i = args.indexOf('--' + name)
  return i >= 0 && typeof args[i + 1] === 'string' ? args[i + 1] : def
}

const PKG_NAME = 'dsh-voice-input'
const profile = opt('profile', 'web')
const home = opt('home', process.env.DSH_HOME ?? join(os.homedir(), '.dsh'))
const here = dirname(fileURLToPath(import.meta.url))

const profileDir = join(home, 'profiles', profile)
const dest = join(profileDir, 'node_modules', PKG_NAME)

function log(...parts) {
  console.log('[dsh-voice-input]', ...parts)
}

// 1. profile 完整性检查
if (!existsSync(join(profileDir, 'package.json'))) {
  console.error(`[dsh-voice-input] 未找到 profile：${profileDir}`)
  console.error('[dsh-voice-input] 请先运行一次 `dsh web`（初始化 web profile）后再安装。')
  process.exit(1)
}

// 2. 复制插件（同路径则跳过；排除 git 元数据、旧版动态插件目录与附件）
if (resolve(here) !== resolve(dest)) {
  cpSync(here, dest, {
    recursive: true,
    filter: (src) =>
      !src.includes('voice-input-plugin') &&
      !src.endsWith('.gitattributes') &&
      !src.endsWith('.tgz') &&
      !src.includes('/.git/') &&
      !src.includes('\\.git\\') &&
      !src.endsWith('/.git') &&
      !src.endsWith('\\.git'),
  })
  log('已复制插件到', dest)
} else {
  log('脚本与安装位置相同，跳过复制')
}

// 3. 幂等写入 cordis.patch.yml 挂载行
const patchPath = join(profileDir, 'cordis.patch.yml')
let yml = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (new RegExp('\\b' + PKG_NAME + '\\b').test(yml)) {
  log('patch 挂载行已存在，跳过')
} else {
  const row = [
    '',
    '# dsh-voice-input 语音输入插件。',
    '- insert:',
    '    - id: ' + PKG_NAME,
    '      name: ' + PKG_NAME,
    '',
  ].join('\n')
  writeFileSync(patchPath, yml.replace(/\s*$/, '\n') + row)
  log('已向', patchPath, '追加挂载行')
}

// 4. 校验与后续提示
const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
log('校验通过：', pkg.name + '@' + pkg.version)
log('完成。patch 监视器会自动热应用宿主侧；若浏览器没出现麦克风按钮，请重启 `dsh web` 后刷新页面。')
log('自检：浏览器打开 http://127.0.0.1:3080/plugins/dsh-voice-input/client.js 应返回 bundle 代码')
