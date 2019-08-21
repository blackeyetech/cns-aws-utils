// imports here
import * as Aws from "./aws-base";
import AWS_DDB from "aws-sdk/clients/dynamodb";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// DynamoDB consts here
const DDB_API_VER = "2012-08-10";

// Interfaces here
export interface Opts extends Aws.Opts {
  table: string;
  tableIndex?: string;
  partitionKey: string;
  sortKey?: string;
}

export interface UpdateItemParams {
  key: { partitionKeyValue: any; sortKeyValue?: any };
  set?: { [key: string]: any };
  add?: { [key: string]: any };
}

export interface SortKeyCriteria {
  operator: string;
  value?: number | string | boolean;
  between?: { high: any; low: any };
}

export interface QueryParams {
  partitionKeyValue: any;
  sortCriteria?: SortKeyCriteria;

  reverseQuery?: boolean;
  limit?: number;

  nextKey?: AWS_DDB.DocumentClient.Key;
}

// Class Table here
export class Table extends Aws.Base {
  // Properties here
  private documentClient: AWS_DDB.DocumentClient;
  private _table: string;
  private _tableIndex?: string;
  private _partitionKey: string;
  private _sortKey?: string;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._table = opts.table;
    this._tableIndex = opts.tableIndex;
    this._partitionKey = opts.partitionKey;
    this._sortKey = opts.sortKey;

    // Create AWS service objects
    this.documentClient = new AWS_DDB.DocumentClient({
      region: this._region,
      apiVersion: DDB_API_VER,
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

  async putItems(items: { [key: string]: any }[]): Promise<boolean> {
    let params: AWS_DDB.DocumentClient.BatchWriteItemInput = {
      RequestItems: {
        [this._table]: [],
      },
    };

    for (let item of items) {
      params.RequestItems[this._table].push({ PutRequest: { Item: item } });
    }

    let success = true;

    await this.documentClient
      .batchWrite(params)
      .promise()
      .catch(e => {
        this.error("putIems (Table: %s) Error: (%s)", this._table, e);
        success = false;
      });

    return success;
  }

  async query(query: QueryParams): Promise<AWS_DDB.DocumentClient.QueryOutput> {
    let values: AWS_DDB.DocumentClient.ExpressionAttributeValueMap = {
      ":p": query.partitionKeyValue,
    };
    let names: AWS_DDB.DocumentClient.ExpressionAttributeNameMap = {
      "#p": this._partitionKey,
    };
    let expression = "#p = :p";

    if (this._sortKey !== undefined && query.sortCriteria !== undefined) {
      names["#s"] = this._sortKey;

      switch (query.sortCriteria.operator) {
        case "EQ":
          expression += " and #s = :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "NE":
          expression += " and #s <> :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "LE":
          expression += " and #s <= :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "LT":
          expression += " and #s < :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "GE":
          expression += " and #s >= :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "GT":
          expression += " and #s > :s";
          values[":s"] = query.sortCriteria.value;
          break;
        case "BETWEEN":
          if (query.sortCriteria.between !== undefined) {
            expression += " and #s BETWEEN :low AND :high";
            values[":low"] = query.sortCriteria.between.low;
            values[":high"] = query.sortCriteria.between.high;
          }
          break;
        case "BEGINS_WITH":
          expression += " and BEGINS_WITH(#s, :s)";
          values[":s"] = query.sortCriteria.value;
          break;
      }
    }

    let params: AWS_DDB.DocumentClient.QueryInput = {
      TableName: this._table,
      IndexName: this._tableIndex,

      ScanIndexForward: query.reverseQuery ? false : true,
      Limit: query.limit,
      ExclusiveStartKey: query.nextKey,

      KeyConditionExpression: expression,
      ExpressionAttributeValues: values,
      ExpressionAttributeNames: names,
    };

    return this.documentClient.query(params).promise();
  }

  async updateItem(item: UpdateItemParams): Promise<boolean> {
    let values: AWS_DDB.DocumentClient.ExpressionAttributeValueMap = {};
    let names: AWS_DDB.DocumentClient.ExpressionAttributeNameMap = {};
    let expression = "SET";
    let nameCode = "a".charCodeAt(0);

    if (item.set !== undefined) {
      for (let key in item.set) {
        let name = String.fromCharCode(nameCode);

        if (name !== "a") {
          expression += ",";
        }

        names[`#${name}`] = key;
        values[`:${name}`] = item.set[key];
        expression += ` #${name} = :${name}`;

        nameCode++;
      }
    }

    if (item.add !== undefined) {
      for (let key in item.add) {
        let name = String.fromCharCode(nameCode);

        if (name !== "a") {
          expression += ",";
        }

        names[`#${name}`] = key;
        values[`:${name}`] = item.add[key];
        expression += ` #${name} = #${name} + :${name}`;

        nameCode++;
      }
    }

    let params: AWS_DDB.DocumentClient.UpdateItemInput = {
      TableName: this._table,
      Key: {
        [this._partitionKey]: item.key.partitionKeyValue,
      },

      ExpressionAttributeValues: values,
      ExpressionAttributeNames: names,
      UpdateExpression: expression,
    };

    if (this._sortKey !== undefined) {
      params.Key[this._sortKey] = item.key.sortKeyValue;
    }

    let success = true;

    await this.documentClient
      .update(params)
      .promise()
      .catch(e => {
        this.error("updateItem (Table: %s) Error: (%s)", this._table, e);
        success = false;
      });

    return success;
  }
}
