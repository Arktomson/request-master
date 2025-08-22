export const serverTempErrorCodes = [
  404, // extra-add
  500, // Internal Server Error :contentReference[oaicite:1]{index=1}
  502, // Bad Gateway           :contentReference[oaicite:2]{index=2}
  503, // Service Unavailable   :contentReference[oaicite:3]{index=3}
  504, // Gateway Timeout       :contentReference[oaicite:4]{index=4}
  // Cloudflare／CDN 扩展码 —— 源站暂不可用或握手失败
  520,
  521,
  522,
  523,
  524,
  525,
  526, // :contentReference[oaicite:5]{index=5}
];

export enum ProcessStatus {
  CACHE = "cache",
  RECOVERY = "recovery",
  ERROR_NO_CACHE = "error_no_cache",
  NO_DO_SOMETHING = "no_do_something",
}
