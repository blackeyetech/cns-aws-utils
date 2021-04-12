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
    let bucket = process.env["TEST_BUCKET"];

    if (bucket === undefined) {
      throw new Error("Must set env var TEST_BUCEKT");
    }

    let test = new AWS.S3.Bucket("Bucket", {
      bucket,
      region: "eu-west-1",
    });

    let files = await test.listFiles("docs/water/site/4");

    this.info("Files: %j", files);

    let url = await test.presignFileRequest(
      "getObject",
      "docs/water/site/1",
      "Summary Report.pdf",
      300,
    );

    this.info("url: %s", url);

    let success = await test.deleteFile("docs/water/site/1/Summary Report.pdf");
    this.info("Deleted succes? %j", success);

    return true;
  }
}

let app = new App("App");
app.start();
