// imports here
import * as Aws from "./aws-base";
import AWS_SecretsManager from "aws-sdk/clients/secretsmanager";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// Secret Manager consts here
const SECRETS_MANAGER_API_VER = "2017-10-17";

// Interfaces here
export interface Opts extends Aws.Opts {
  secret: string;
}

// Class Secrets here
export class Secret extends Aws.Base {
  // Properties here
  private _secret: string;
  private _secretsManager: AWS_SecretsManager;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._secret = opts.secret;

    this._secretsManager = new AWS_SecretsManager({
      region: this._region,
      apiVersion: SECRETS_MANAGER_API_VER,
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

  async setValue(value: string): Promise<boolean> {
    let success = true;

    await this._secretsManager
      .putSecretValue({
        SecretId: this._secret,
        SecretString: value,
      })
      .promise()
      .catch(e => {
        this.error(
          "setValue (Secret: %s) Error: (%s: %s).",
          this._secret,
          e.code,
          e,
        );
        success = false;
      });

    if (success) {
      return true;
    }

    return false;
  }

  async getValue(stage: string = "AWSCURRENT"): Promise<string> {
    let data = await this._secretsManager
      .getSecretValue({
        SecretId: this._secret,
        VersionStage: stage,
      })
      .promise()
      .catch(e => {
        this.error(
          "getValue (Secret: %s) Error: (%s: %s).",
          this._secret,
          e.code,
          e,
        );
      });

    if (data === undefined || data.SecretString === undefined) {
      return "";
    }

    return data.SecretString;
  }

  async getPreviousValue(): Promise<string> {
    return await this.getValue("AWSPREVIOUS");
  }

  async restoreLastValue(): Promise<string> {
    let value = await this.getPreviousValue();

    if (this.setValue(value)) {
      return value;
    }

    return "";
  }
}
