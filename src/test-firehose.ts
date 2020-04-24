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
    let utils = new AWS.Utils("aws-utils");
    let stream = utils.addFirehoseStream("FirehoseStream", {
      region: "eu-west-1",
      deliveryStream: "ops",
      appendNewline: false,
    });

    // utils.replayRecordings("sns.pb");
    utils.startRecordingFirehoseStreams("fh.pb");

    let obj = {
      a: "a",
      b: "b",
      c: "c",
    };
    let msg = JSON.stringify(obj);

    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);
    stream.putRecord(msg);

    return true;
  }
}

let app = new App("App");
app.start();
