// imports here
import CNShell from "cn-shell";
import { Base } from "./aws-base";
import * as SQS from "./aws-sqs";
import * as SNS from "./aws-sns";
import * as DDB from "./aws-dynamodb";

import AWS_SQS from "aws-sdk/clients/sqs";
import AWS_SNS from "aws-sdk/clients/sns";
import AWS_DDB from "aws-sdk/clients/dynamodb";

import * as fs from "fs";

// Class AwsUtils here
class Utils extends CNShell {
  // Properties here
  private _queues: Map<string, SQS.Sender | SQS.Receiver>;
  private _topics: Map<string, SNS.Topic>;
  private _tables: Map<string, DDB.Table>;

  // Constructor here
  constructor(name: string) {
    super(name);

    this._queues = new Map();
    this._topics = new Map();
    this._tables = new Map();
  }

  // Methods here
  async start(): Promise<boolean> {
    for (let [name, queue] of this._queues.entries()) {
      this.info(`Starting queue ${name} ...`);

      if (queue instanceof SQS.Receiver) {
        queue.start();
      }

      this.info("Started!");
    }

    return true;
  }

  async stop(): Promise<void> {
    for (let [name, queue] of this._queues.entries()) {
      this.info(`Stopping queue ${name} ...`);

      if (queue instanceof SQS.Receiver) {
        await queue.stop();
      }

      this.info("Stopped!");
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  addSqsSender(name: string, opts: SQS.SenderOpts): SQS.Sender {
    if (this._queues.has(name)) {
      throw new Error(
        `addSqsSender: Queue with the name ${name} already exists!`,
      );
    }

    let queue = new SQS.Sender(name, opts);
    this.info(`Adding SQS Sender: ${name}`);
    this._queues.set(name, queue);

    return queue;
  }

  addSqsReceiver(name: string, opts: SQS.ReceiverOpts): SQS.Receiver {
    if (this._queues.has(name)) {
      throw new Error(
        `addSqsReceiver: Queue with the name ${name} already exists!`,
      );
    }

    let queue = new SQS.Receiver(name, opts);

    this.info(`Adding SQS Receiver: ${name}`);
    this._queues.set(name, queue);

    return queue;
  }

  addSnsTopic(name: string, opts: SNS.Opts): SNS.Topic {
    if (this._topics.has(name)) {
      throw new Error(
        `addSnsTopic: Topic with the name ${name} already exists!`,
      );
    }

    let sns = new SNS.Topic(name, opts);

    this.info(`Adding SNS Topic: ${name}`);
    this._topics.set(name, sns);

    return sns;
  }

  addTable(name: string, opts: DDB.Opts): DDB.Table {
    if (this._tables.has(name)) {
      throw new Error(`addTable: Table with the name ${name} already exists!`);
    }

    let table = new DDB.Table(name, opts);

    this.info(`Adding DDB Table: ${name}`);
    this._tables.set(name, table);

    return table;
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
      if (queue instanceof SQS.Receiver) {
        queue.startRecording(playbackFile);
      }
    }
  }

  startRecordingSqsSenders(playbackFile: string): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof SQS.Sender) {
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
      if (queue instanceof SQS.Receiver) {
        queue.stopRecording();
      }
    }
  }

  stopRecordingSqsSenders(): void {
    for (let [, queue] of this._queues.entries()) {
      if (queue instanceof SQS.Sender) {
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
      let record = Base.replayPlayback(fd, line);
      line++;

      if (record === null) {
        break;
      }

      if (
        record.type === Base.RecordTypes.SQS_SENDER ||
        record.type === Base.RecordTypes.SQS_RECEIVER
      ) {
        let queue = this._queues.get(record.name);

        if (queue === undefined) {
          continue;
        }

        if (
          record.type === Base.RecordTypes.SQS_SENDER &&
          queue instanceof SQS.Sender
        ) {
          queue.injectMessage(record.msg);
        } else if (
          record.type === Base.RecordTypes.SQS_RECEIVER &&
          queue instanceof SQS.Receiver
        ) {
          queue.injectMessages(record.msg);
        }
      } else if (record.type === Base.RecordTypes.SNS) {
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

export { Utils, SQS, SNS, DDB, AWS_SQS, AWS_SNS, AWS_DDB };
