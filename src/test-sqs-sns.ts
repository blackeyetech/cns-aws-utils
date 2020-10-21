import CNShell from "cn-shell";
import * as AWS from "./main";

class App extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    let utils = new AWS.Utils("aws-utils");

    let fifo = utils.addSqsSender("Fifo", {
      region: "eu-west-1",
      queue: "https://sqs.eu-west-1.amazonaws.com/876656827505/commands.fifo",
      fifo: true,
    });

    await fifo.sendMessage("Howdy foo!!");
    await fifo.sendMessage("Howdy foo again!!", undefined, "heyho");

    return true;
  }
}

let app = new App("App");
app.start();
