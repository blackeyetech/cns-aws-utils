import CNShell from "cn-shell";
import * as AWS from "./main";

const SecretARN = process.env["SECRET_ARN"];

class App extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    let test = new AWS.Secrets.Secret("Secretly", {
      secret: SecretARN === undefined ? "UNKNOWN" : SecretARN,
      region: "eu-west-1",
    });

    let value = await test.getValue();
    this.info("Current value: %s", value);
    let previous = await test.getPreviousValue();
    this.info("Previous value: %s", previous);

    let restore = await test.restoreLastValue();

    if (restore !== previous) {
      this.error("failed to restore previous value");
      return false;
    }

    await sleep(2000);

    this.info("previous value restored");

    value = await test.getValue();
    this.info("Current value: %s", value);
    previous = await test.getPreviousValue();
    this.info("Previous value: %s", previous);

    let success = await test.setValue(previous);
    if (success) {
      this.info("restored manually succeeded");
    } else {
      this.error("restored manually failed");
    }

    await sleep(2000);

    value = await test.getValue();
    this.info("Current value: %s", value);
    previous = await test.getPreviousValue();
    this.info("Previous value: %s", previous);

    return true;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

let app = new App("App");
app.start();
