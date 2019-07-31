// imports here
import { AwsBase, AwsOpts } from "./aws-base";
import CNShell from "cn-shell";
import SQS from "aws-sdk/clients/sqs";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const SQS_API_VER = "2012-11-05";
const MIN_BATCH_SIZE = 10;

// Interfaces here
interface AwsSqsReceiverOpts extends AwsOpts {
  queue: string;
  pollInterval: number;
  backoffInterval: number;

  msgProcesser: (msg: SQS.Message) => Promise<void>;
}

// Class AwsSqsReceiver here
class AwsSqsReceiver extends AwsBase {
  // Properties here
  private readonly _queue: string;
  private _sqs: SQS;
  private _pollInterval: number;
  private _backoffInterval: number;
  private _nowReceiving: boolean;
  private _stopNow: boolean;
  private _processMessage: (msg: SQS.Message) => void;

  // Constructor here
  constructor(name: string, shell: CNShell, opts: AwsSqsReceiverOpts) {
    super(name, shell, opts);

    this._queue = opts.queue;
    this.info("Queue: %s", this._queue);
    this._pollInterval = opts.pollInterval;
    this.info("PollInterval (ms): %s", this._pollInterval);
    this._backoffInterval = opts.backoffInterval;
    this.info("BackoffInterval (ms): %s", this._backoffInterval);
    this._processMessage = opts.msgProcesser;

    this._nowReceiving = false;
    this._stopNow = false;

    // Create AWS service objects
    this._sqs = new SQS({ region: this._region, apiVersion: SQS_API_VER });
  }

  // Public and Private methods here
  start(): void {
    setImmediate(() => this.startReceiving());
  }

  private async startReceiving(): Promise<void> {
    let processed = 0;

    this._nowReceiving = true;

    const rcvParams: SQS.ReceiveMessageRequest = {
      QueueUrl: this._queue,
      AttributeNames: ["All"],
      MaxNumberOfMessages: MIN_BATCH_SIZE,
      MessageAttributeNames: ["All"],
    };

    // If we have received msgs and we have not received a stop request
    // then keep checking for more msgs
    do {
      // Check if there are any message in the queue
      let data = await this._sqs
        .receiveMessage(rcvParams)
        .promise()
        .catch(e => {
          this.error("receiveMessage Error: %s", e);
        });

      if (data === undefined || data.Messages === undefined) {
        processed = 0;
      } else {
        processed = await this.receiveMessage(data.Messages);
      }
    } while (processed > 0 && !this._stopNow);

    // If we have not received a request to stop then backoff for a while
    // before checking if anymore msgs have come in
    if (!this._stopNow) {
      setTimeout(() => this.startReceiving(), this._backoffInterval);
    }

    this._nowReceiving = false;
  }

  async injectMessages(msgs: string): Promise<number> {
    return await this.receiveMessage(JSON.parse(msgs));
  }

  private async receiveMessage(msgs: SQS.Message[]): Promise<number> {
    let processed = 0;

    let delParams: SQS.DeleteMessageBatchRequest = {
      QueueUrl: this._queue,
      Entries: [],
    };

    // Check if we are currently recording a playback
    if (this._playbackFile !== "") {
      this.writePlayback(
        JSON.stringify(msgs),
        AwsBase.RecordTypes.SQS_RECEIVER,
      );
    }

    // Process each msg individually
    for (let i in msgs) {
      await this._processMessage(msgs[i]);

      delParams.Entries.push({
        Id: `${i}`,
        ReceiptHandle: msgs[i].ReceiptHandle,
      } as SQS.DeleteMessageBatchRequestEntry);

      processed++;
    }

    // Delete the messages that have been processed
    await this._sqs
      .deleteMessageBatch(delParams)
      .promise()
      .catch(e => {
        this.error("deleteMessage Error: %s", e);
      });

    return processed;
  }

  async stop(): Promise<any> {
    this.info("Attempting to stop receiving ..,");
    this._stopNow = true;

    // Return a promise so that the calling method can use 'await'
    return new Promise(resolve => {
      this.stopReceiving(resolve);
    });
  }

  private stopReceiving(resolve: () => void): void {
    // If we are currently NOT reading from the queue then stop,
    // i.e. resolve the promise
    if (this._nowReceiving) {
      // If we are currently reading from the queue try again in 1000 ms
      setTimeout(() => {
        this.stopReceiving(resolve);
      }, 1000);
    } else {
      this.info("Stopped receiving!");
      resolve();
    }
  }
}

export { AwsSqsReceiver, AwsSqsReceiverOpts };
