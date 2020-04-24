// imports here
import * as Aws from "./aws-base";
import AWS_FIREHOSE from "aws-sdk/clients/firehose";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const FIREHOSE_API_VER = "2015-08-04";

// Interfaces here
export interface Opts extends Aws.Opts {
  deliveryStream: string;
  appendNewline: boolean;
}

// Class FirehoseStream here
export class FirehoseStream extends Aws.Base {
  // Properties here
  private readonly _deliveryStream: string;
  private _fh: AWS_FIREHOSE;
  private _appendNewline: boolean;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._deliveryStream = opts.deliveryStream;
    this._appendNewline = opts.appendNewline;
    this.info("Delivery Stream Name: %s", this._deliveryStream);

    // Create AWS service objects
    this._fh = new AWS_FIREHOSE({
      region: this._region,
      apiVersion: FIREHOSE_API_VER,
    });
  }

  // Public and Private methods here
  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async injectMessage(msg: string): Promise<boolean> {
    return await this.putRecord(msg);
  }

  async putRecord(msg: string): Promise<boolean> {
    let putParams = <AWS_FIREHOSE.PutRecordInput>{
      DeliveryStreamName: this._deliveryStream,
      Record: {
        Data: `${msg}${this._appendNewline ? "\n" : ""}`,
      },
    };

    let success = true;

    await this._fh
      .putRecord(putParams)
      .promise()
      .catch(e => {
        this.error("FH putRecord Error: %s", e);
        success = false;
      });

    if (this._playbackFile !== "") {
      this.writePlayback(msg, Aws.Base.RecordTypes.FHS);
    }

    return success;
  }
}
