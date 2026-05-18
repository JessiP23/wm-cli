/**
 * Shared constants. Keep in sync with `mcp-director/src/config.py`.
 * Anything that names an env var, an endpoint, or a model id belongs here.
 */

export const DEFAULTS = {
  /** Hosted WM Studio REST API base. Override via `WMSTUDIO_API_URL`. */
  apiUrl: "https://wmstudio.io/api",
  /** Page surfaced when the API requires a public asset URL. */
  uploadUrl: "https://wmstudio.io/dashboard/uploads",
  /** Credit top-up landing page. */
  upgradeUrl: "https://wmstudio.io/dashboard/credits",
  /** Where users create API keys. Shown by `wm login`. */
  apiKeysUrl: "https://wmstudio.io/dashboard/api-keys",
  /** Below this remaining-credit count we surface a warning. */
  lowCreditsThreshold: 50,
  /** Default request timeout (ms) for non-job calls. */
  requestTimeoutMs: 60_000,
  /** Polling interval (ms) for async jobs. */
  jobPollIntervalMs: 4_000,
  /** Hard ceiling for job polling (ms). */
  jobPollTimeoutMs: 15 * 60 * 1000,
} as const

export const ENV = {
  ApiUrl: "WMSTUDIO_API_URL",
  ApiKey: "WM_API_KEY",
  UploadUrl: "ASSET_UPLOAD_URL",
  UpgradeUrl: "CREDITS_UPGRADE_URL",
  LowCreditsThreshold: "CREDITS_LOW_THRESHOLD",
  LogLevel: "WM_LOG_LEVEL",
  ConfigDir: "WM_CONFIG_DIR",
} as const

/** Default model ids per tool — mirror `mcp-director/src/tools/studio.py` defaults. */
export const DEFAULT_MODELS = {
  image: "fal-ai/nano-banana-pro",
  imageEdit: "fal-ai/nano-banana-pro/edit",
  videoText: "bytedance/seedance-2.0-fast",
  videoImage: "bytedance/seedance-2.0-fast",
  upscaleImage: "fal-ai/topaz/upscale/image",
  upscaleVideo: "fal-ai/topaz/upscale/video",
  threeD: "fal-ai/meshy/v6/image-to-3d",
  brandshot: "fal-ai/nano-banana-pro",
  cameraAngles: "fal-ai/nano-banana-pro",
  casting: "fal-ai/nano-banana-pro",
  ugcRoom: "fal-ai/nano-banana-pro",
} as const
