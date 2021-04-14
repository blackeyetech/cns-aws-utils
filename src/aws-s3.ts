// imports here
import * as Aws from "./aws-base";
import AWS_S3 from "aws-sdk/clients/s3";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// S3 consts here
const S3_API_VER = "2006-03-01";

// Interfaces here
export interface Opts extends Aws.Opts {
  bucket: string;
}

// Class Bucket here
export class Bucket extends Aws.Base {
  // Properties here
  private _bucket: string;
  private _s3: AWS_S3;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._bucket = opts.bucket;
    this.info("S3 Bucket name: %s", this._bucket);

    // Create AWS service objects
    this._s3 = new AWS_S3({
      region: this._region,
      apiVersion: S3_API_VER,
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

  async listFiles(directory: string): Promise<string[]> {
    let success = true;

    let data = <AWS_S3.ListObjectsV2Output>await this._s3
      .listObjectsV2({
        Bucket: this._bucket,
        Prefix: `${directory}/`,
      })
      .promise()
      .catch(e => {
        this.error(
          "listFiles (bucket: %s) Error: (%s: %s). Prefix was (%s)",
          this._bucket,
          e.code,
          e,
          directory,
        );

        success = false;
      });

    let files: string[] = [];

    if (success && data.Contents !== undefined) {
      // NOTE: Will include a "/" if this is a folder
      for (let content of data.Contents) {
        if (content.Key !== undefined) {
          // This will create an array with 2 elements:
          //  - 1st is the dir
          //  - 2nd is the key
          let parts = content.Key.split(`${directory}/`);
          if (parts.length === 2 && parts[1].length > 0 && parts[1] !== "/") {
            files.push(parts[1]);
          }
        }
      }
    }

    return files;
  }

  async presignFileRequest(
    operation: string,
    directory: string,
    file: string,
    expires: number,
  ): Promise<string | undefined> {
    let url = await this._s3
      .getSignedUrlPromise(operation, {
        Bucket: this._bucket,
        Key: `${directory}/${file}`,
        Expires: expires,
      })
      .catch(e => {
        this.error(
          "presignFileRequest (bucket: %s) Error: (%s: %s). File/Operation  (%s/%s)",
          this._bucket,
          e.code,
          e,
          file,
          operation,
        );
      });

    if (typeof url === "string") {
      return url;
    }

    return undefined;
  }

  async deleteFile(file: string): Promise<boolean> {
    let success = true;

    await this._s3
      .deleteObject({
        Bucket: this._bucket,
        Key: file,
      })
      .promise()
      .catch(e => {
        this.error(
          "deleteFile (bucket: %s) Error: (%s: %s). File was (%s)",
          this._bucket,
          e.code,
          e,
          file,
        );

        success = false;
      });

    return success;
  }
}
