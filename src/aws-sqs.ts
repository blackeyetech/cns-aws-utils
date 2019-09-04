// imports here
import { Base, Opts } from "./aws-base";
import AWS_SQS from "aws-sdk/clients/sqs";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const SQS_API_VER = "2012-11-05";
const MIN_BATCH_SIZE = 10;

// Interfaces here
export interface SenderOpts extends Opts {
  queue: string;
}

export interface ReceiverOpts extends Opts {
  queue: string;
  pollInterval: number;
  backoffInterval: number;

  msgProcesser: (msgs: AWS_SQS.Message[]) => Promise<number[]>;
}

// Class Sender here
export class Sender extends Base {
  // Properties here
  private readonly _queue: string;
  private _sqs: AWS_SQS;

  // Constructor here
  constructor(name: string, opts: SenderOpts) {
    super(name, opts);

    this._queue = opts.queue;
    this.info("Queue: %s", this._queue);

    // Create AWS service objects
    this._sqs = new AWS_SQS({ region: this._region, apiVersion: SQS_API_VER });
  }

  // Public and Private methods here
  async start(): Promise<boolean> {
    return true;
  }

  async injectMessage(msg: string): Promise<boolean> {
    let parsed: any = JSON.parse(msg);
    return await this.sendMessage(parsed.msg, parsed.attribs);
  }

  async sendMessage(
    msg: string,
    attribs?: AWS_SQS.MessageBodyAttributeMap,
  ): Promise<boolean> {
    if (this._playbackFile !== "") {
      this.writePlayback(
        JSON.stringify({ msg, attribs }),
        Base.RecordTypes.SQS_SENDER,
      );
    }

    let params: AWS_SQS.SendMessageRequest = {
      QueueUrl: this._queue,
      MessageBody: msg,
      MessageAttributes: attribs,
    };

    let success = true;

    await this._sqs
      .sendMessage(params)
      .promise()
      .catch(e => {
        this.error("sendMessage Error: %s", e);
        success = false;
      });

    return success;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Class Receiver here
export class Receiver extends Base {
  // Properties here
  private readonly _queue: string;
  private _sqs: AWS_SQS;
  private _pollInterval: number;
  private _backoffInterval: number;
  private _nowReceiving: boolean;
  private _stopNow: boolean;
  private _processMessages: (msgs: AWS_SQS.Message[]) => Promise<number[]>;

  // Constructor here
  constructor(name: string, opts: ReceiverOpts) {
    super(name, opts);

    this._queue = opts.queue;
    this.info("Queue: %s", this._queue);
    this._pollInterval = opts.pollInterval;
    this.info("PollInterval (s): %s", this._pollInterval);
    this._backoffInterval = opts.backoffInterval;
    this.info("BackoffInterval (s): %s", this._backoffInterval);
    this._processMessages = opts.msgProcesser;

    this._nowReceiving = false;
    this._stopNow = false;

    // Create AWS service objects
    this._sqs = new AWS_SQS({ region: this._region, apiVersion: SQS_API_VER });
  }

  // Public and Private methods here
  async start(): Promise<boolean> {
    setImmediate(() => this.startReceiving());

    return true;
  }

  private async startReceiving(): Promise<void> {
    let processed = 0;

    this._nowReceiving = true;

    const rcvParams: AWS_SQS.ReceiveMessageRequest = {
      QueueUrl: this._queue,
      AttributeNames: ["All"],
      MaxNumberOfMessages: MIN_BATCH_SIZE,
      MessageAttributeNames: ["All"],
      WaitTimeSeconds: this._pollInterval,
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

      if (
        data === null ||
        data === undefined ||
        data.Messages === undefined ||
        data.Messages.length === 0
      ) {
        processed = 0;
      } else {
        processed = await this.receiveMessage(data.Messages);
      }
    } while (processed > 0 && !this._stopNow);

    // If we have not received a request to stop then backoff for a while
    // before checking if anymore msgs have come in
    if (!this._stopNow) {
      setTimeout(() => this.startReceiving(), this._backoffInterval * 1000);
    }

    this._nowReceiving = false;
  }

  async injectMessages(msgs: string): Promise<number> {
    return await this.receiveMessage(JSON.parse(msgs));
  }

  private async receiveMessage(msgs: AWS_SQS.Message[]): Promise<number> {
    // Check if we are currently recording a playback
    if (this._playbackFile !== "") {
      this.writePlayback(JSON.stringify(msgs), Base.RecordTypes.SQS_RECEIVER);
    }

    // Process msgs in a batch
    let msgsProcessed = await this._processMessages(msgs);

    if (msgsProcessed.length === 0) {
      return 0;
    }

    let delParams: AWS_SQS.DeleteMessageBatchRequest = {
      QueueUrl: this._queue,
      Entries: [],
    };

    // Only delete the messages that have been marked processed
    for (let i of msgsProcessed) {
      delParams.Entries.push({
        Id: `${i}`,
        ReceiptHandle: msgs[i].ReceiptHandle,
      } as AWS_SQS.DeleteMessageBatchRequestEntry);
    }

    // Delete the messages that have been processed
    await this._sqs
      .deleteMessageBatch(delParams)
      .promise()
      .catch(e => {
        this.error("deleteMessage Error: %s", e);
      });

    return msgsProcessed.length;
  }

  async stop(): Promise<void> {
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

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
