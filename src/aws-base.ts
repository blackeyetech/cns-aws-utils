// imports here
import CNShell from "cn-shell";
import * as fs from "fs";

// Playback version consts here
const END_OF_FILE = "";
const SQS_RCV_PLAYBACK_VER_1 = "SQS-RCV-V1";
const SQS_SND_PLAYBACK_VER_1 = "SQS-SND-V1";
const SNS_PLAYBACK_VER_1 = "SNS-V1";

const SQS_RCV_CURRENT_PLAYBACK_VER = SQS_RCV_PLAYBACK_VER_1;
const SQS_SND_CURRENT_PLAYBACK_VER = SQS_SND_PLAYBACK_VER_1;
const SNS_CURRENT_PLAYBACK_VER = SNS_PLAYBACK_VER_1;

// Enums here
enum RecordTypes {
  SNS,
  SQS_SENDER,
  SQS_RECEIVER,
}

// Interfaces here
interface AwsOpts {
  region: string;
}

interface PlaybackRecord {
  type: RecordTypes;
  name: string;
  ts: number;
  msg: string;
}

// Class AwsBase here
abstract class AwsBase extends CNShell {
  // Properties here
  protected readonly _region: string;
  protected _playbackFile: string;

  // Constructor here
  constructor(name: string, opts: AwsOpts) {
    super(name);

    this._region = opts.region;
    this.info("Region: %s", this._region);

    this._playbackFile = "";
  }

  // Getters here
  static get RecordTypes(): typeof RecordTypes {
    return RecordTypes;
  }

  // Public/private methods here
  protected writePlayback(msg: string, type: RecordTypes): void {
    if (this._playbackFile === "") {
      return;
    }

    switch (type) {
      case RecordTypes.SNS:
        // Check the current playback we should generate
        switch (SNS_CURRENT_PLAYBACK_VER) {
          case SNS_PLAYBACK_VER_1:
            this.writePbFld(SNS_PLAYBACK_VER_1, "|");
            this.writePbFld(this.name, "|");
            this.writePbFld(Date.now().toString(), "|");
            this.writePbFld(msg, "\n");
            break;
        }
        break;
      case RecordTypes.SQS_SENDER:
        // Check the current playback we should generate
        switch (SQS_SND_CURRENT_PLAYBACK_VER) {
          case SQS_SND_PLAYBACK_VER_1:
            this.writePbFld(SQS_SND_PLAYBACK_VER_1, "|");
            this.writePbFld(this.name, "|");
            this.writePbFld(Date.now().toString(), "|");
            this.writePbFld(msg, "\n");
            break;
        }
        break;
      case RecordTypes.SQS_RECEIVER:
        // Check the current playback we should generate
        switch (SQS_RCV_CURRENT_PLAYBACK_VER) {
          case SQS_RCV_PLAYBACK_VER_1:
            this.writePbFld(SQS_RCV_PLAYBACK_VER_1, "|");
            this.writePbFld(this.name, "|");
            this.writePbFld(Date.now().toString(), "|");
            this.writePbFld(msg, "\n");
            break;
        }
        break;
    }
  }

  private writePbFld(fld: string, delimiter: string): void {
    // The 1st byte indicates, in ASCII, how many bytes make up the len
    // The following bytes, in ASCII, are the size
    // e.g. is len is 120 bytes the encoding is "3120"
    let fldSize = fld.length.toString();

    let field = `${fldSize.length}${fldSize}${fld}${delimiter}`;
    fs.appendFileSync(this._playbackFile, field);
  }

  startRecording(playbackFile: string): void {
    if (playbackFile === "") {
      this.error("startRecording: Must specify a playback file");
    }

    this.info("Starting to record to playback file: %s", playbackFile);

    this._playbackFile = playbackFile;
  }

  stopRecording(): void {
    this.info("Stopping recording to playback file: %s", this._playbackFile);

    this._playbackFile = "";
  }

  // Static methods here
  static replayPlayback(fd: number, line: number): PlaybackRecord | null {
    // The first field is ALWAYS the playback version
    let version = AwsBase.getPbFld("version", fd, line);

    switch (version) {
      case SQS_SND_PLAYBACK_VER_1:
        return {
          type: RecordTypes.SQS_SENDER,
          name: AwsBase.getPbFld("name", fd, line),
          ts: parseInt(AwsBase.getPbFld("ts", fd, line), 10),
          msg: AwsBase.getPbFld("msg", fd, line),
        };
        break;
      case SQS_RCV_PLAYBACK_VER_1:
        return {
          type: RecordTypes.SQS_RECEIVER,
          name: AwsBase.getPbFld("name", fd, line),
          ts: parseInt(AwsBase.getPbFld("ts", fd, line), 10),
          msg: AwsBase.getPbFld("msg", fd, line),
        };
      case SNS_PLAYBACK_VER_1:
        return {
          type: RecordTypes.SNS,
          name: AwsBase.getPbFld("name", fd, line),
          ts: parseInt(AwsBase.getPbFld("ts", fd, line), 10),
          msg: AwsBase.getPbFld("msg", fd, line),
        };
      case END_OF_FILE:
        return null;
      default:
        throw new Error(
          `startPlayback: Playback line ${line}: Unknown version`,
        );
    }
  }

  private static getPbFld(name: string, fd: number, line: number): string {
    // The 1st byte represents the number of byte that make up the len
    let sizeLenBuf = new Buffer(1);
    let bytes = fs.readSync(fd, sizeLenBuf, 0, 1, null);
    if (bytes !== 1) {
      // Can not read any more bytse that means: End of file
      return END_OF_FILE;
    }

    let sizeLen = parseInt(sizeLenBuf.toString(), 10);

    // The next msgSizeLen number of bytes contains the size of the msg
    let sizeBuf = new Buffer(sizeLen);
    bytes = fs.readSync(fd, sizeBuf, 0, sizeLen, null);
    if (bytes !== sizeLen) {
      throw new Error(
        `getPbFld: Playback line ${line}: Can not read msgSize of ${name}`,
      );
    }

    let size = parseInt(sizeBuf.toString(), 10);

    // Get the fld
    let fldBuf = new Buffer(size);
    bytes = fs.readSync(fd, fldBuf, 0, size, null);
    if (bytes !== size) {
      throw new Error(
        `getPbFld: Playback line ${line}: Can not read field of ${name}`,
      );
    }

    // All flds have a delimiter of 1 byte - read but ignore it
    bytes = fs.readSync(fd, sizeLenBuf, 0, 1, null);

    return fldBuf.toString();
  }
}

export { AwsBase, AwsOpts };
