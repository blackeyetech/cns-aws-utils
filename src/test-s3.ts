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
    let test = new AWS.S3.Bucket("Bucket", {
      bucket: "docs-irl-dev1-fm2point0-net",
      region: "eu-west-1",
    });

    let files = await test.listFiles("docs/water/site/1");

    this.info("Files: %j", files);

    let url = await test.presignFileRequest(
      "getObject",
      "docs/water/site/1",
      "Summary Report.pdf",
      300,
    );

    this.info("url: %s", url);
    return true;
  }
}

let app = new App("App");
app.start();
