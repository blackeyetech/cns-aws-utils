import CNShell from "cn-shell";
import * as AWS from "./main";

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
    let utils = new AWS.Utils("aws-utils");
    let topic1 = utils.addSnsTopic(SNS1, {
      region: "eu-west-1",
      publishTopic: topic === undefined ? "UNKNOWN" : topic,
    });

    // utils.replayRecordings("sns.pb");
    // utils.startRecordingSns("sns.pb");

    topic1.publish("Fecking feckers 1");
    topic1.publish("Fecking feckers 2");
    topic1.publish("Fecking feckers 3");

    let sender1 = utils.addSqsSender(SENDER, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
    });

    let recv1 = utils.addSqsReceiver(RECVER1, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
      pollInterval: 10,
      backoffInterval: 5,
      msgProcesser: async (msgs: AWS.AWS_SQS.Message[]) => {
        let processed: number[] = [];
        for (let i = 0; i < msgs.length; i++) {
          console.log(`RECV1: ${msgs[i].Body}`);
          processed.push(i);
        }
        return processed;
      },
    });

    let recv2 = utils.addSqsReceiver(RECVER2, {
      region: "eu-west-1",
      queue: queue === undefined ? "UNKNOWN" : queue,
      pollInterval: 10,
      backoffInterval: 5,
      msgProcesser: async (msgs: AWS.AWS_SQS.Message[]) => {
        let processed: number[] = [];
        for (let i = 0; i < msgs.length; i++) {
          console.log(`RECV2: ${msgs[i].Body}`);
          processed.push(i);
        }
        return processed;
      },
    });

    // utils.replayRecordings("recver.pb");
    // utils.replayRecordings("sender.pb");
    // utils.startRecordingSqsSenders("sender.pb");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    await sender1.sendMessage("Howdy you!!");
    await sender1.sendMessage("Howdy me!!");
    await sender1.sendMessage("Howdy sue!!");
    await sender1.sendMessage("Howdy foo!!");

    // utils.startRecordingSqsReceivers("recver.pb");
    // utils.start();
    recv1.start();
    recv2.start();

    return true;
  }
}

let app = new App("App");
app.start();
