import * as AWS from "./main";

let _assets: AWS.DDB.Table;
let _master: AWS.DDB.Table;

_assets = new AWS.DDB.Table("Assets", {
  region: "eu-west-1",
  table: "assets",
  partitionKey: "buildingId",
  sortKey: "id",
});

_master = new AWS.DDB.Table("Master", {
  region: "eu-west-1",
  table: "master_data",
  partitionKey: "dataType",
  sortKey: "dataKey",
});

(async () => {
  let masterParams: AWS.DDB.QueryParams = {
    partitionKeyValue: "building",
  };

  let buildings = await _master.query(masterParams);

  if (
    buildings === undefined ||
    buildings.Items === undefined ||
    buildings.Items.length === 0
  ) {
    return;
  }

  for (let building of buildings.Items) {
    let params: AWS.DDB.QueryParams = {
      partitionKeyValue: building.dataKey,
    };

    let assets = await _assets.query(params);

    if (
      assets === undefined ||
      assets.Items === undefined ||
      assets.Items.length === 0
    ) {
      return;
    }

    for (let asset of assets.Items) {
      let params: AWS.DDB.UpdateItemParams = {
        key: { partitionKeyValue: asset.buildingId, sortKeyValue: asset.id },
        set: {
          buildingOverrides: {
            water: {},
          },
        },
        conditions: [
          {
            condition: "NOT_EXISTS",
            attribute: "buildingOverrides",
          },
        ],
      };
      await _assets.updateItem(params);
    }
  }
})();
