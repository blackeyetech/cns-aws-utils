import CNShell from "cn-shell";
import * as AWS from "./main";

const table = "assets"; //process.env["TEST_TABLE"];

class App extends CNShell {
  private _table1: AWS.DDB.Table;

  constructor(name: string) {
    super(name);

    this._table1 = new AWS.DDB.Table("Assets", {
      region: "eu-west-1",
      table: table === undefined ? "UNKNOWN" : table,
      partitionKey: "building_id",
      sortKey: "id",
    });
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    return true;
  }

  async query(params: AWS.DDB.QueryParams) {
    let results = await this._table1.query(params);

    return results.Items;
  }

  async update(params: AWS.DDB.UpdateItemParams) {
    await this._table1.updateItem(params);
  }
}

let app = new App("App");
app.start();

(async () => {
  for (let i = 1; i <= 12; i++) {
    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: i.toString(),
    };

    let assets = await app.query(params);

    if (assets === undefined) {
      return;
    }

    for (let asset of assets) {
      let params: AWS.DDB.UpdateItemParams = {
        key: { partitionKeyValue: asset.building_id, sortKeyValue: asset.id },
        set: { ["cmds_pending.fc"]: 0 },
      };
      await app.update(params);
    }
  }
})();
