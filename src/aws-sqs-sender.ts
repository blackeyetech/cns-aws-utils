// imports here
import { AwsBase, AwsOpts } from "./aws-base";
import SQS from "aws-sdk/clients/sqs";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const SQS_API_VER = "2012-11-05";

// Interfaces here
interface AwsSqsSenderOpts extends AwsOpts {
  queue: string;
}

// Class AwsSqsSender here
class AwsSqsSender extends AwsBase {
  // Properties here
  private readonly _queue: string;
  private _sqs: SQS;

  // Constructor here
  constructor(name: string, opts: AwsSqsSenderOpts) {
    super(name, opts);

    this._queue = opts.queue;
    this.info("Queue: %s", this._queue);

    // Create AWS service objects
    this._sqs = new SQS({ region: this._region, apiVersion: SQS_API_VER });
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
    attribs?: SQS.MessageBodyAttributeMap,
  ): Promise<boolean> {
    if (this._playbackFile !== "") {
      this.writePlayback(
        JSON.stringify({ msg, attribs }),
        AwsBase.RecordTypes.SQS_SENDER,
      );
    }

    let params: SQS.SendMessageRequest = {
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

export { AwsSqsSender, AwsSqsSenderOpts };
