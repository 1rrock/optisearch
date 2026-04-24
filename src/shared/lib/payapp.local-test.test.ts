import { describe, expect, it, vi } from "vitest";

describe("payapp local test mode", () => {
  it("maps billRegist command to payrequest when PAYAPP_LOCAL_TEST_MODE is enabled", async () => {
    const originalEnv = {
      PAYAPP_LOCAL_TEST_MODE: process.env.PAYAPP_LOCAL_TEST_MODE,
      PAYAPP_API_URL: process.env.PAYAPP_API_URL,
      PAYAPP_USERID: process.env.PAYAPP_USERID,
      PAYAPP_LINK_KEY: process.env.PAYAPP_LINK_KEY,
    };

    try {
      process.env.PAYAPP_LOCAL_TEST_MODE = "true";
      process.env.PAYAPP_API_URL = "http://localhost:20001/oapi/apiLoad.html";
      process.env.PAYAPP_USERID = "optisearch";
      process.env.PAYAPP_LINK_KEY = "test-link-key";
      vi.stubEnv("NODE_ENV", "test");

      const fetchMock = vi.fn().mockResolvedValue({
        text: async () => "state=1&payurl=http%3A%2F%2Flocalhost%3A20001%2Fp%2Fabc",
      });

      vi.stubGlobal("fetch", fetchMock);

      vi.resetModules();
      const payapp = await import("@/shared/lib/payapp");

      await payapp.registerBillKey({
        goodname: "로컬 테스트",
        recvphone: "01012345678",
        var1: "user-1:basic",
        var2: "billkey_registration",
        feedbackurl: "http://localhost:3000/api/payments/payapp/webhook",
        returnurl: "http://localhost:3000/settings?from=payment",
        smsuse: "n",
        openpaytype: "card",
      });

      const fetchCall = fetchMock.mock.calls[0];
      const body = new URLSearchParams(String(fetchCall?.[1]?.body ?? ""));

      expect(body.get("cmd")).toBe("payrequest");
      expect(body.get("goodprice")).toBeNull();
      expect(body.get("price")).toBe("1000");
    } finally {
      process.env.PAYAPP_LOCAL_TEST_MODE = originalEnv.PAYAPP_LOCAL_TEST_MODE;
      process.env.PAYAPP_API_URL = originalEnv.PAYAPP_API_URL;
      process.env.PAYAPP_USERID = originalEnv.PAYAPP_USERID;
      process.env.PAYAPP_LINK_KEY = originalEnv.PAYAPP_LINK_KEY;
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
