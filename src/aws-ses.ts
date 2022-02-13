// imports here
import * as Aws from "./aws-base";
import AWS_SESv2 from "aws-sdk/clients/sesv2";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// S3 consts here
const SES_API_VER = "2019-09-27";

const SES_CHARSET = "UTF-8";

// Interfaces here
export interface Opts extends Aws.Opts {
  source: string;
  replyTo: string;
  domain: string;
  arn: string;
}

export interface EmailRequest {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyIsHtml: boolean;
}

// Class Bucket here
export class SESv2 extends Aws.Base {
  // Properties here
  private _ses: AWS_SESv2;
  private _source: string;
  private _replyTo: string;
  private _arn: string;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    // Create AWS service objects
    this._ses = new AWS_SESv2({
      region: this._region,
      apiVersion: SES_API_VER,
    });

    this._source = `${opts.source}@${opts.domain}`;
    this._replyTo = `${opts.replyTo}@${opts.domain}`;
    this._arn = opts.arn;
  }

  // Public and Private methods here
  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async send(request: EmailRequest): Promise<string | undefined> {
    let params: AWS_SESv2.Types.SendEmailRequest = {
      Destination: {
        ToAddresses: request.to,
        CcAddresses: request.cc,
        BccAddresses: request.bcc,
      },
      Content: {},
      FromEmailAddress: this._source,
      ReplyToAddresses: [this._replyTo],
      FromEmailAddressIdentityArn: this._arn,
    };

    // This is crap but if you mark Html or Text as undefiend the API errors
    if (request.bodyIsHtml) {
      params.Content = {
        Simple: {
          Body: {
            Html: { Data: request.body, Charset: SES_CHARSET },
          },
          Subject: { Data: request.subject, Charset: SES_CHARSET },
        },
      };
    } else {
      params.Content = {
        Simple: {
          Body: {
            Text: { Data: request.body, Charset: SES_CHARSET },
          },
          Subject: { Data: request.subject, Charset: SES_CHARSET },
        },
      };
    }

    let res = await this._ses
      .sendEmail(params)
      .promise()
      .catch(e => {
        this.error("send Error: (%s: %s). Request was (%j)", e.code, e, params);
      });

    if (typeof res === "object") {
      return res?.MessageId;
    }

    return;
  }
}
