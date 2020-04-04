import CNShell from "cn-shell";
import * as AWS from "./main";

const table = "master_data"; //process.env["TEST_TABLE"];

class App extends CNShell {
  private _table1: AWS.DDB.Table;

  constructor(name: string) {
    super(name);

    this._table1 = new AWS.DDB.Table("AccountMasterData", {
      region: "eu-west-1",
      table: table === undefined ? "UNKNOWN" : table,
      partitionKey: "data_type",
      sortKey: "data_key",
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
      partitionKeyValue: "device-type",
    };

    let results = await this._table1.query(params);

    if (results.Items === undefined) {
      return;
    }

    for (let i = 0; i < results.Items.length; i++) {
      let item = results.Items[i];

      console.log("%j", item);
    }
  }

  async queryTest2() {
    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: "thing",
      sortCriteria: {
        operator: "EQ",
        value: "CREEVX#POC-AC1#ORG-1#SITE-1#00137A10000033D1",
      },
    };

    let results = await this._table1.query(params);

    if (results.Items === undefined) {
      return;
    }

    for (let i = 0; i < results.Items.length; i++) {
      let item = results.Items[i];

      if (item.enabled) {
        console.log("%j", item);
      }
    }
  }

  async updateTest() {
    let upParams: AWS.DDB.UpdateItemParams = {
      key: { partitionKeyValue: "id", sortKeyValue: "site" },

      add: {
        id: 1,
      },
      returnUpdated: true,
    };

    let res = await this._table1.updateItem(upParams);
    this.info("%j", res);
    // let qryParams: AWS.DDB.QueryParams = {
    //   partitionKeyValue: "id",
    //   sortCriteria: {
    //     operator: "EQ",
    //     value: "site",
    //   },
    // };

    // let results = await this._table1.query(qryParams);
  }
}

let app = new App("App");
app.start();

// app.putTest();
//app.queryTest();
app.updateTest();
