import waitFor from "wait-for-async";

import SDK from "@ringcentral/sdk";
import RingCentral from "@rc-ex/core";
import RingCentralExtension from "@rc-ex/rcsdk";
import WebSocketExtension from "@rc-ex/ws";

require("dotenv").config();
jest.setTimeout(60 * 1000);

describe("extensions", () => {
  test("RingCentral Extension + WebSocket Extension", async () => {
    const rc = new RingCentral();

    // install RingCentral Extension
    const sdk = new SDK({
      clientId: process.env.RINGCENTRAL_CLIENT_ID,
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
      server: process.env.RINGCENTRAL_SERVER_URL,
    });
    await sdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD,
    });

    const ringCentralExtension = new RingCentralExtension(sdk);
    await rc.installExtension(ringCentralExtension);

    // install WebSocket Extension
    const webSocketExtension = new WebSocketExtension({
      restOverWebSocket: true,
    });
    await rc.installExtension(webSocketExtension);

    // setup subscription
    let eventCount = 0;
    await webSocketExtension.subscribe(
      ["/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS"],
      (event) => {
        console.log(event);
        eventCount += 1;
      }
    );

    // Rest API call over WebSocket
    await rc
      .restapi()
      .account()
      .extension()
      .sms()
      .post({
        from: { phoneNumber: process.env.RINGCENTRAL_USERNAME },
        to: [{ phoneNumber: process.env.RINGCENTRAL_USERNAME }], // send sms to oneself
        text: "Hello world",
      });

    const successful = await waitFor({
      condition: () => eventCount > 0,
      interval: 1000,
      times: 30,
    });

    expect(successful).toBeTruthy();
    expect(eventCount).toBeGreaterThan(0);

    await sdk.logout();
    await rc.revoke();
  });
});
