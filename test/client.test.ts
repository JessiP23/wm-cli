import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { WmApiClient } from "../src/client.js"
import { WmCliError } from "../src/errors.js"

const API = "https://api.test.local"

const server = setupServer(
  http.get(`${API}/me`, ({ request }) => {
    const auth = request.headers.get("authorization")
    if (auth !== "Bearer good-key") {
      return HttpResponse.json({ error: "bad token" }, { status: 401 })
    }
    return HttpResponse.json({
      userId: "u_1",
      email: "tester@wm.studio",
      creditsRemaining: 1234,
      plan: "pro",
    })
  }),
  http.post(`${API}/studio/upscale-image`, async () => {
    return HttpResponse.json(
      { error: "Not enough credits", requiresTopUp: true, upgradeUrl: "https://wmstudio.io/billing" },
      { status: 402 }
    )
  }),
  http.post(`${API}/studio/generate-video`, async () =>
    HttpResponse.json({ error: "boom" }, { status: 500 })
  )
)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function clientWith(apiKey: string | undefined): WmApiClient {
  return new WmApiClient({
    apiUrl: API,
    apiKey,
    uploadUrl: "https://upload.test",
    upgradeUrl: "https://upgrade.test",
    lowCreditsThreshold: 10,
    configPath: "/tmp/x",
  })
}

describe("WmApiClient", () => {
  it("returns the account when auth succeeds", async () => {
    const me = await clientWith("good-key").whoami()
    expect(me.email).toBe("tester@wm.studio")
    expect(me.creditsRemaining).toBe(1234)
  })

  it("throws auth_required when api key is missing", async () => {
    await expect(clientWith(undefined).whoami()).rejects.toMatchObject({
      code: "auth_required",
    })
  })

  it("throws auth_invalid on 401", async () => {
    await expect(clientWith("bad-key").whoami()).rejects.toBeInstanceOf(WmCliError)
    await expect(clientWith("bad-key").whoami()).rejects.toMatchObject({ code: "auth_invalid" })
  })

  it("throws upgrade_required on 402 / requiresTopUp", async () => {
    await expect(
      clientWith("good-key").json({
        method: "POST",
        path: "/studio/upscale-image",
        body: { image_url: "x" },
      })
    ).rejects.toMatchObject({
      code: "upgrade_required",
      details: { upgradeUrl: "https://wmstudio.io/billing" },
    })
  })

  it("classifies 5xx as server error", async () => {
    await expect(
      clientWith("good-key").json({ method: "POST", path: "/studio/generate-video", body: {} })
    ).rejects.toMatchObject({ code: "server" })
  })
})
