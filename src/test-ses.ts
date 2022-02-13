import CNShell from "cn-shell";
import * as AWS from "./main";

class App extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    let arn = process.env["SES_ARN"];
    let domain = process.env["DOMAIN"];
    let toEmail = process.env["TO_EMAIL"];

    if (arn === undefined) {
      throw new Error("Must set env var SES_ARN");
    }
    if (domain === undefined) {
      throw new Error("Must set env var DOMAIN");
    }
    if (toEmail === undefined) {
      throw new Error("Must set env var TO_EMAIL");
    }

    let test = new AWS.SESv2.SESv2("SES", {
      region: "eu-west-1",
      source: "alerts",
      replyTo: "no-reply",
      domain,
      arn,
    });

    let msgId = await test.send({
      to: [toEmail],
      subject: "Hello",
      body: "<b>Good morning</b><br>How are you<br>Signed<br>Me",
      bodyIsHtml: true,
    });

    this.info("MsgId: %s", msgId);

    return true;
  }
}

let app = new App("App");
app.start();
