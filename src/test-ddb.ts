import CNShell from "cn-shell";
import * as AWS from "./main";

const table = process.env["TEST_TABLE"];

class App extends CNShell {
  private _table1: AWS.DDB.Table;
  private _utils: AWS.Utils;

  constructor(name: string) {
    super(name);

    this._utils = new AWS.Utils("aws-utils");

    this._table1 = this._utils.addTable("TEST", {
      region: "eu-west-1",
      table: table === undefined ? "UNKNOWN" : table,
      partitionKey: "data_type",
    });
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    return true;
  }

  async putTest() {
    for (let key = 0; key < 1000000; key++) {
      await this._table1.putItems([
        { key, sort: 1, data: "something" },
        { key, sort: 2, data: "something" },
        { key, sort: 3, data: "something" },
        { key, sort: 4, data: "something" },
        { key, sort: 5, data: "something" },
        { key, sort: 6, data: "something" },
        { key, sort: 7, data: "something" },
        { key, sort: 8, data: "something" },
        { key, sort: 9, data: "something" },
        { key, sort: 10, data: "something" },
      ]);
    }
  }

  async queryTest() {
    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: "platform",
    };

    let results = await this._table1.query(params);

    console.log("%j", results);
  }

  async updateTest() {
    let upParams: AWS.DDB.UpdateItemParams = {
      key: { partitionKeyValue: 1, sortKeyValue: 2 },
      set: {
        data: "something else",
      },
    };

    await this._table1.updateItem(upParams);
    let qryParams: AWS.DDB.QueryParams = {
      partitionKeyValue: 1,
    };

    let results = await this._table1.query(qryParams);

    console.log("%j", results);
  }
}

let app = new App("App");
app.start();

// app.putTest();
app.queryTest();
// app.updateTest();
