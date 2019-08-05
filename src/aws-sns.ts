// imports here
import { AwsBase, AwsOpts } from "./aws-base";
import SNS from "aws-sdk/clients/sns";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// SQS consts here
const SNS_API_VER = "2010-03-31";

// Interfaces here
interface AwsSnsOpts extends AwsOpts {
  publishTopic: string;
}

// Class AwsSns here
class AwsSns extends AwsBase {
  // Properties here
  private readonly _publishTopic: string;
  private _sns: SNS;

  // Constructor here
  constructor(name: string, opts: AwsSnsOpts) {
    super(name, opts);

    this._publishTopic = opts.publishTopic;
    this.info("Publish Topic: %s", this._publishTopic);

    // Create AWS service objects
    this._sns = new SNS({ region: this._region, apiVersion: SNS_API_VER });
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
    return await this.publishMessage(parsed.msg, parsed.attribs);
  }

  async publishMessage(
    msg: string,
    attribs?: SNS.MessageAttributeMap,
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
        AwsBase.RecordTypes.SNS,
      );
    }

    return success;
  }
}

export { AwsSns, AwsSnsOpts };
