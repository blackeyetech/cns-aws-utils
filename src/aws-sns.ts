// imports here
import * as Aws from "./aws-base";
import AWS_SNS from "aws-sdk/clients/sns";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const SNS_API_VER = "2010-03-31";

// Interfaces here
export interface Opts extends Aws.Opts {
  publishTopic: string;
}

// Class AwsSns here
export class Topic extends Aws.Base {
  // Properties here
  private readonly _publishTopic: string;
  private _sns: AWS_SNS;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._publishTopic = opts.publishTopic;
    this.info("Publish Topic: %s", this._publishTopic);

    // Create AWS service objects
    this._sns = new AWS_SNS({ region: this._region, apiVersion: SNS_API_VER });
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
    let parsed: any = JSON.parse(msg);
    return await this.publish(parsed.msg, parsed.attribs);
  }

  async publish(
    msg: string,
    attribs?: AWS_SNS.MessageAttributeMap,
  ): Promise<boolean> {
    let pubParams = {
      TopicArn: this._publishTopic,
      Message: msg,
      MessageAttributes: attribs,
    };

    let success = true;

    await this._sns
      .publish(pubParams)
      .promise()
      .catch(e => {
        this.error("SNS publish Error: %s", e);
        success = false;
      });

    if (this._playbackFile !== "") {
      this.writePlayback(
        JSON.stringify({ msg, attribs }),
        Aws.Base.RecordTypes.SNS,
      );
    }

    return success;
  }
}
