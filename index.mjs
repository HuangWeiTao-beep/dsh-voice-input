// dsh-voice-input — host half.
//
// 空 apply：本插件全部能力在浏览器半边（exports["./client"]）。
// node 半边存在的意义与官方 dsh-client-ui-* 包一致——让插件出现在
// host 的 cordis.yml 与 Loader 中，浏览器半边经 dsh.client 清单声明被发现。

export const name = 'dsh-voice-input'

export const apply = () => {}
