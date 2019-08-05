import CNShell from "cn-shell";
import * as CNAwsUtils from "./main";

const SENDER = "Sender1";
const RECVER1 = "Receiver1";
const RECVER2 = "Receiver2";
const SNS1 = "SNS1";

const queue = process.env["TEST_QUEUE"];
const topic = process.env["TOPIC"];

class App extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    let utils = new CNAwsUtils.AwsUtils("aws-utils");
    utils.addSnsPublisher(SNS1, {
      region: "eu-west-1",
      publishTopic: topic === undefined ? "UNKNOWN" : topic,
    });

    // utils.replayRecordings("sns.pb");
    // utils.startRecordingSns("sns.pb");

    // utils.publishSnsMessage(SNS1, "Fecking feckers1");
    // utils.publishSnsMessage(SNS1, "Fecking feckers2");
    // utils.publishSnsMessage(SNS1, "Fecking feckers3");

    utils.addSqsSender(SENDER, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
    });

    utils.addSqsReceiver(RECVER1, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
      pollInterval: 10,
      backoffInterval: 5,
      msgProcesser: async (msg: CNAwsUtils.SQS.Message) => {
        console.log(msg.Body);
        return;
      },
    });

    utils.addSqsReceiver(RECVER2, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
      pollInterval: 10,
      backoffInterval: 5,
      msgProcesser: async (msg: CNAwsUtils.SQS.Message) => {
        console.log(msg.Body);
        return;
      },
    });

    // utils.replayRecordings("recver.pb");
    // utils.replayRecordings("sender.pb");
    // utils.startRecordingSqsSenders("sender.pb");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    await utils.sendSqsMessage(SENDER, "Howdy you!!");
    await utils.sendSqsMessage(SENDER, "Howdy me!!");
    await utils.sendSqsMessage(SENDER, "Howdy sue!!");
    await utils.sendSqsMessage(SENDER, "Howdy foo!!");

    utils.startRecordingSqsReceivers("recver.pb");
    utils.start();

    return true;
  }
}

let app = new App("App");
app.start();
