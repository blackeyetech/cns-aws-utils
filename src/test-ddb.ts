import CNShell from "cn-shell";
import * as AWS from "./main";

const table = process.env["TEST_TABLE"];

class App extends CNShell {
  private _table1: AWS.DDB.Table;

  constructor(name: string) {
    super(name);

    this._table1 = new AWS.DDB.Table("Test", {
      region: "eu-west-1",
      table: table === undefined ? "UNKNOWN" : table,
      partitionKey: "id",
      sortKey: "sort",
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
    await this._table1.putItems([
      {
        data_type: "asset",
        data_key: "xxx",
        monitors: {
          IN: {
            tr: {
              count: 0,
            },
          },
        },
      },
    ]);

    let qryParams: AWS.DDB.QueryParams = {
      partitionKeyValue: "asset",
      sortCriteria: {
        operator: "EQ",
        value: "xxx",
      },
    };

    let results = await this._table1.query(qryParams);
    this.info("%j", results);
  }

  async queryTest() {
    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: "device-type",
      // sortCriteria: {
      //   operator: "GT",
      //   value: Date.now() - 24 * 60 * 60 * 1000 * 15,
      // },
      attributes: ["gateway", "sensors.type"],
    };

    let results = await this._table1.query(params);

    if (results.Items === undefined) {
      return;
    }

    console.info("%j", results.Items);
    // for (let i = 0; i < results.Items.length; i++) {
    //   let item = results.Items[i];

    //   console.log("%j", item);
    // }
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
      key: { partitionKeyValue: "asset", sortKeyValue: "xxx" },
      add: { "monitors.IN.tr.count": 10 },
      //append: { "m.l": [1] },
    };

    let res1 = await this._table1.updateItem(upParams);
    this.info("%j", res1);
  }

  async counterTest() {
    let value = await this._table1.getNextAtomicCounter("atomic1");

    console.log("counter: %s", value);

    sleep(1);
  }

  async newQry(key: AWS.DDB.GetDeleteParams) {
    return this._table1.getItem(key);
  }
  async newPut(item: { [key: string]: any }) {
    return this._table1.putItem(item);
  }
  async newDelete(key: AWS.DDB.GetDeleteParams) {
    return this._table1.deleteItem(key);
  }

  async scanTest() {
    let results = await this._table1.scan();

    if (results.Items === undefined) {
      return;
    }

    console.info("%j", results.Items);
    console.info("%j", JSON.stringify(results.Items).length);
    // for (let i = 0; i < results.Items.length; i++) {
    //   let item = results.Items[i];

    //   console.log("%j", item);
    // }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

let app = new App("App");
app.start();

(async () => {
  let items = await app.scanTest();

  // let item = await app.newQry({ partitionKeyValue: "1", sortKeyValue: "1" });
  // console.log("%j", item);
  // let success = await app.newPut({ id: "1", sort: "1" });
  // console.log(success);
  // item = await app.newQry({ partitionKeyValue: "1", sortKeyValue: "1" });
  // console.log("%j", item);
  // success = await app.newDelete({ partitionKeyValue: "1", sortKeyValue: "1" });
  // console.log(success);
  // success = await app.newDelete({ partitionKeyValue: "1", sortKeyValue: "1" });
  // console.log(success);
  // item = await app.newQry({ partitionKeyValue: "1", sortKeyValue: "1" });
  // console.log("%j", item);
  // await app.putTest();
  // await app.queryTest();
  // await app.updateTest();
  // await app.counterTest();
})();
