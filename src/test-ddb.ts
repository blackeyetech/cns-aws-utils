import CNShell from "cn-shell";
import * as AWS from "./main";

const table = "master_data"; //process.env["TEST_TABLE"];

class App extends CNShell {
  private _table1: AWS.DDB.Table;

  constructor(name: string) {
    super(name);

    this._table1 = new AWS.DDB.Table("Measurements", {
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
    await this._table1.putItems([
      {
        data_type: "asset",
        data_key: "xxx",
        monitors: {},
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
    console.time("Starting");

    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: "PHWATER#GLFDCO#LEGION#COLD#COLD7#WATER",
      // sortCriteria: {
      //   operator: "GT",
      //   value: Date.now() - 24 * 60 * 60 * 1000 * 15,
      // },
    };

    let results = await this._table1.query(params);

    if (results.Items === undefined) {
      return;
    }

    console.timeEnd("Starting");
    console.info(results.Items.length);
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
    let m = "monitors";
    let set = <{ [key: string]: any }>{};
    set[`${m}.FLOW`] = "flow";
    set[`${m}.RET`] = "ret";
    set[`${m}.counter`] = 0;

    let upParams: AWS.DDB.UpdateItemParams = {
      key: { partitionKeyValue: "asset", sortKeyValue: "xxx" },
      set,
    };

    let res1 = await this._table1.updateItem(upParams);
    this.info("%j", res1);

    let qryParams: AWS.DDB.QueryParams = {
      partitionKeyValue: "asset",
      sortCriteria: {
        operator: "EQ",
        value: "xxx",
      },
    };

    let results = await this._table1.query(qryParams);

    this.info("%j", results);

    let add = <{ [key: string]: any }>{};
    add[`${m}.counter`] = 1;
    set = {};
    set[`${m}.counter2`] = 0;

    upParams = {
      key: { partitionKeyValue: "asset", sortKeyValue: "xxx" },
      add,
      set,
      remove: [`${m}.RET`],
      returnUpdated: "UPDATED_NEW",
    };

    let results2 = await this._table1.updateItem(upParams);
    this.info("%j", results2);

    sleep(1000);
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
  // await app.putTest();
  // await app.queryTest();
  await app.updateTest();
})();
