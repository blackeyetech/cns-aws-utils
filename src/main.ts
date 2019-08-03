// imports here
import CNShell from "cn-shell";
import { AwsBase } from "./aws-base";
import { AwsSqsReceiver, AwsSqsReceiverOpts } from "./aws-sqs-receiver";
import { AwsSqsSender, AwsSqsSenderOpts } from "./aws-sqs-sender";
import { AwsSns, AwsSnsOpts } from "./aws-sns";
import SQS from "aws-sdk/clients/sqs";
import SNS from "aws-sdk/clients/sns";
import * as fs from "fs";

// Class AwsUtils here
class AwsUtils extends CNShell.CNExtension {
  // Properties here
  private _queues: Map<string, AwsSqsSender | AwsSqsReceiver>;
  private _topics: Map<string, AwsSns>;

  // Constructor here
  constructor(name: string, shell: CNShell) {
    super(name, shell);

    this._queues = new Map();
    this._topics = new Map();
  }

  // Methods here
  start(): void {
    for (let [name, queue] of this._queues.entries()) {
      this.info(`Starting queue ${name} ...`);

      if (queue instanceof AwsSqsReceiver) {
        queue.start();
      }

      this.info("Started!");
    }
  }

  async stop(): Promise<any> {
    for (let [name, queue] of this._queues.entries()) {
      this.info(`Stopping queue ${name} ...`);

      if (queue instanceof AwsSqsReceiver) {
        await queue.stop();
      }

      this.info("Stopped!");
    }
  }

  addSqsSender(name: string, opts: AwsSqsSenderOpts) {
    if (this._queues.has(name)) {
      throw new Error(
        `addSqsSender: Queue with the name ${name} already exists!`,
      );
    }

    this.info(`Adding SQS Sender: ${name}`);
    this._queues.set(name, new AwsSqsSender(name, this._shell, opts));
  }

  addSqsReceiver(name: string, opts: AwsSqsReceiverOpts) {
    if (this._queues.has(name)) {
      throw new Error(
        `addSqsReceiver: Queue with the name ${name} already exists!`,
      );
    }

    this.info(`Adding SQS Receiver: ${name}`);
    this._queues.set(name, new AwsSqsReceiver(name, this._shell, opts));
  }

  addSnsPublisher(name: string, opts: AwsSnsOpts) {
    if (this._topics.has(name)) {
      throw new Error(
        `addSnsTopic: Topic with the name ${name} already exists!`,
      );
    }

    this.info(`Adding SNS Topic: ${name}`);
    this._topics.set(name, new AwsSns(name, this._shell, opts));
  }

  async sendSqsMessage(
    name: string,
    msg: string,
    attribs?: SQS.MessageBodyAttributeMap,
  ): Promise<boolean> {
    let queue = this._queues.get(name);

    if (queue === undefined) {
      throw new Error(
        `sendSqsMessage: Can not find Queue with the name ${name}!`,
      );
    }

    if (queue instanceof AwsSqsReceiver) {
      throw new Error(`sendSqsMessage: Queue ${name} not a sender!`);
    }

    return await queue.sendMessage(msg, attribs);
  }

  async publishSnsMessage(
    name: string,
    msg: string,
    attribs?: SNS.MessageAttributeMap,
  ): Promise<boolean> {
    let topic = this._topics.get(name);

    if (topic === undefined) {
      throw new Error(
        `publishSnsMessage: Can not find Topic with the name ${name}!`,
      );
    }

    return await topic.publishMessage(msg, attribs);
  }

  startRecording(playbackFile: string): void {
    for (let [, queue] of this._queues.entries()) {
      queue.startRecording(playbackFile);
    }

    for (let [, topic] of this._topics.entries()) {
      topic.startRecording(playbackFile);
    }
  }

  startRecordingSqsReceivers(playbackFile: string): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof AwsSqsReceiver) {
        queue.startRecording(playbackFile);
      }
    }
  }

  startRecordingSqsSenders(playbackFile: string): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof AwsSqsSender) {
        queue.startRecording(playbackFile);
      }
    }
  }

  startRecordingSns(playbackFile: string): void {
    for (let [, topic] of this._topics.entries()) {
      topic.startRecording(playbackFile);
    }
  }

  stopRecording(): void {
    for (let [, queue] of this._queues.entries()) {
      queue.stopRecording();
    }
    for (let [, topic] of this._topics.entries()) {
      topic.stopRecording();
    }
  }

  stopRecordingSqsReceivers(): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof AwsSqsReceiver) {
        queue.stopRecording();
      }
    }
  }

  stopRecordingSqsSenders(): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof AwsSqsSender) {
        queue.stopRecording();
      }
    }
  }

  stopRecordingSns(): void {
    for (let [, topic] of this._topics.entries()) {
      topic.stopRecording();
    }
  }

  replayRecordings(playbackFile: string) {
    let fd = fs.openSync(playbackFile, "r");
    let line = 1;

    while (true) {
      let record = AwsBase.replayPlayback(fd, line);
      line++;

      if (record === null) {
        break;
      }

      if (
        record.type === AwsBase.RecordTypes.SQS_SENDER ||
        record.type === AwsBase.RecordTypes.SQS_RECEIVER
      ) {
        let queue = this._queues.get(record.name);

        if (queue === undefined) {
          continue;
        }

        if (
          record.type === AwsBase.RecordTypes.SQS_SENDER &&
          queue instanceof AwsSqsSender
        ) {
          queue.injectMessage(record.msg);
        } else if (
          record.type === AwsBase.RecordTypes.SQS_RECEIVER &&
          queue instanceof AwsSqsReceiver
        ) {
          queue.injectMessages(record.msg);
        }
      } else if (record.type === AwsBase.RecordTypes.SNS) {
        let topic = this._topics.get(record.name);

        if (topic === undefined) {
          continue;
        }

        topic.injectMessage(record.msg);
      }
    }

    fs.closeSync(fd);
  }
}

export { AwsUtils, AwsSqsReceiverOpts, AwsSqsSenderOpts, SQS, SNS };
