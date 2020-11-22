// imports here
import * as Aws from "./aws-base";
import AWS_DDB from "aws-sdk/clients/dynamodb";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// DynamoDB consts here
const DDB_API_VER = "2012-08-10";
const DDB_COUNTER = "counter";

// Consts here
export let CriteriaOperators = {
  EQ: "EQ",
  NE: "NE",
  LE: "LE",
  LT: "LT",
  GE: "GE",
  GT: "GT",
  BETWEEN: "BETWEEN",
  BEGINS_WITH: "BEGINS_WITH",
  EXISTS: "EXISTS",
  NOT_EXISTS: "NOT_EXISTS",
};

// Interfaces here
export interface Opts extends Aws.Opts {
  table: string;
  tableIndex?: string;
  partitionKey: string;
  sortKey?: string;
}

export interface UpdateItemConditions {
  condition: string;
  attribute: string;
  value?: number | string | boolean;
  between?: { high: any; low: any };
}

export interface UpdateItemParams {
  key: { partitionKeyValue: any; sortKeyValue?: any };
  set?: { [key: string]: any };
  add?: { [key: string]: any };
  append?: { [key: string]: any[] };
  remove?: string[];
  // condition?: {
  //   exists: boolean;
  //   attribute: string;
  // };
  conditions?: UpdateItemConditions[];

  returnUpdated?: string;
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

  attributes?: string[];
}

export interface GetDeleteParams {
  partitionKeyValue: any;
  sortKeyValue?: any;
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

  // code = "ThrottlingException"
  async putItem(item: { [key: string]: any }): Promise<boolean> {
    let params: AWS_DDB.DocumentClient.PutItemInput = {
      TableName: this._table,
      Item: item,
    };

    let success = true;

    await this.documentClient
      .put(params)
      .promise()
      .catch(e => {
        this.error(
          "putIem (Table: %s) Error: (%s: %s).",
          this._table,
          e.code,
          e,
          params,
        );
        success = false;
      });

    return success;
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
        this.error(
          "putIems (Table: %s) Error: (%s: %s).",
          this._table,
          e.code,
          e,
          params,
        );
        success = false;
      });

    // TODO: Need to ensure there are no more then 25 items being passed
    // and check for unprocessed items
    return success;
  }

  async getItem(
    key: GetDeleteParams,
  ): Promise<AWS_DDB.DocumentClient.GetItemOutput | void> {
    let params: AWS_DDB.DocumentClient.DeleteItemInput = {
      TableName: this._table,
      Key: {
        [this._partitionKey]: key.partitionKeyValue,
      },
    };

    if (this._sortKey !== undefined && key.sortKeyValue !== undefined) {
      params.Key[this._sortKey] = key.sortKeyValue;
    }

    let item = await this.documentClient
      .get(params)
      .promise()
      .catch(e => {
        this.error(
          "getItem (Table: %s) Error: (%s: %s).",
          this._table,
          e.code,
          e,
          params,
        );
      });

    return item;
  }

  async deleteItem(key: GetDeleteParams): Promise<boolean> {
    let params: AWS_DDB.DocumentClient.DeleteItemInput = {
      TableName: this._table,
      Key: {
        [this._partitionKey]: key.partitionKeyValue,
      },
    };

    if (this._sortKey !== undefined && key.sortKeyValue !== undefined) {
      params.Key[this._sortKey] = key.sortKeyValue;
    }

    let success = true;

    await this.documentClient
      .delete(params)
      .promise()
      .catch(e => {
        this.error(
          "deleteItem (Table: %s) Error: (%s: %s).",
          this._table,
          e.code,
          e,
          params,
        );

        success = false;
      });

    return success;
  }

  async query(query: QueryParams): Promise<AWS_DDB.DocumentClient.QueryOutput> {
    let values: AWS_DDB.DocumentClient.ExpressionAttributeValueMap = {
      ":pval": query.partitionKeyValue,
    };
    let names: AWS_DDB.DocumentClient.ExpressionAttributeNameMap = {
      "#pkey": this._partitionKey,
    };
    let expression = "#pkey = :pval";

    if (this._sortKey !== undefined && query.sortCriteria !== undefined) {
      names["#skey"] = this._sortKey;

      switch (query.sortCriteria.operator) {
        case CriteriaOperators.EQ:
          expression += " and #skey = :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.NE:
          expression += " and #skey <> :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.LE:
          expression += " and #skey <= :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.LT:
          expression += " and #skey < :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.GE:
          expression += " and #skey >= :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.GT:
          expression += " and #skey > :sval";
          values[":sval"] = query.sortCriteria.value;
          break;
        case CriteriaOperators.BETWEEN:
          if (query.sortCriteria.between !== undefined) {
            expression += " and #skey between :low AND :high";
            values[":low"] = query.sortCriteria.between.low;
            values[":high"] = query.sortCriteria.between.high;
          }
          break;
        case CriteriaOperators.BEGINS_WITH:
          expression += " and begins_with(#skey, :sval)";
          values[":sval"] = query.sortCriteria.value;
          break;
      }
    }

    let attributes = "";
    if (query.attributes !== undefined) {
      let name = "a";
      let nameCode = name.charCodeAt(0);

      for (let attrib of query.attributes) {
        name = String.fromCharCode(nameCode);
        if (name !== "a") {
          attributes += ",";
        }

        names[`#${name}`] = attrib;
        attributes += `#${name}`;

        nameCode++;
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

    if (attributes.length) {
      params.ProjectionExpression = attributes;
    }

    this.debug("%j", params);

    return this.documentClient.query(params).promise();
  }

  async updateItem(
    item: UpdateItemParams,
  ): Promise<boolean | { [key: string]: any }> {
    let values: AWS_DDB.DocumentClient.ExpressionAttributeValueMap = {};
    let names: AWS_DDB.DocumentClient.ExpressionAttributeNameMap = {};
    let expression = "";
    let name = "a";
    let nameCode = name.charCodeAt(0);

    if (item.set !== undefined) {
      expression = "SET";

      for (let key in item.set) {
        name = String.fromCharCode(nameCode);
        if (name !== "a") {
          expression += ",";
        }

        // Check if this is a map or not (a map will contain '.'s)
        let map = key.split(".");
        if (map.length === 1) {
          names[`#${name}`] = key;
          values[`:${name}`] = item.set[key];
          expression += ` #${name} = :${name}`;
        } else {
          let first = map.slice(0, map.length - 1).join(".");
          let second = map.slice(-1)[0];

          names[`#${name}`] = second;
          values[`:${name}`] = item.set[key];
          expression += ` ${first}.#${name} = :${name}`;
        }

        nameCode++;
      }
    }

    if (item.add !== undefined) {
      if (expression.length === 0) {
        expression = "SET";
      }

      for (let key in item.add) {
        name = String.fromCharCode(nameCode);
        if (name !== "a") {
          expression += ",";
        }

        // Check if this is a map or not (a map will contain '.'s)
        let map = key.split(".");
        if (map.length === 1) {
          names[`#${name}`] = key;
          values[`:${name}`] = item.add[key];
          expression += ` #${name} = #${name} + :${name}`;
        } else {
          let first = map.slice(0, map.length - 1).join(".");
          let second = map.slice(-1)[0];

          names[`#${name}`] = second;
          values[`:${name}`] = item.add[key];
          expression += ` ${first}.#${name} = ${first}.#${name} + :${name}`;
        }

        nameCode++;
      }
    }

    if (item.append !== undefined) {
      if (expression.length === 0) {
        expression = "SET";
      }

      for (let key in item.append) {
        name = String.fromCharCode(nameCode);
        if (name !== "a") {
          expression += ",";
        }

        // Check if this is a map or not (a map will contain '.'s)
        let map = key.split(".");
        if (map.length === 1) {
          names[`#${name}`] = key;
          values[`:${name}`] = item.append[key];
          expression += ` #${name} = list_append(#${name}, :${name})`;
        } else {
          let first = map.slice(0, map.length - 1).join(".");
          let second = map.slice(-1)[0];

          names[`#${name}`] = second;
          values[`:${name}`] = item.append[key];
          expression += ` ${first}.#${name} = list_append(${first}.#${name}, :${name})`;
        }

        nameCode++;
      }
    }

    let startName = String.fromCharCode(nameCode);

    if (item.remove !== undefined && item.remove.length) {
      expression += " REMOVE";
      for (let key of item.remove) {
        name = String.fromCharCode(nameCode);

        if (name !== startName) {
          expression += ",";
        }

        // Check if this is a map or not (a map will contain '.'s)
        let map = key.split(".");
        if (map.length === 1) {
          names[`#${name}`] = key;
          expression += ` #${name} `;
        } else {
          let first = map.slice(0, map.length - 1).join(".");
          let second = map.slice(-1)[0];

          names[`#${name}`] = second;
          expression += ` ${first}.#${name}`;
        }

        nameCode++;
      }
    }

    let conditionExpression = "";

    let conditions = <UpdateItemConditions[]>[];
    if (item.conditions !== undefined) {
      conditions = item.conditions;
    }

    for (let condition of conditions) {
      if (conditionExpression.length) {
        conditionExpression += " and ";
      }

      let name = String.fromCharCode(nameCode);

      names[`#${name}`] = condition.attribute;

      switch (condition.condition) {
        case CriteriaOperators.EXISTS:
          conditionExpression += `attribute_exists(#${name})`;
          break;
        case CriteriaOperators.NOT_EXISTS:
          conditionExpression += `attribute_not_exists(#${name})`;
          break;
        case CriteriaOperators.EQ:
          conditionExpression += `#${name} = :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.NE:
          conditionExpression += `#${name} <> :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.LE:
          conditionExpression += `#${name} <= :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.LT:
          conditionExpression += `#${name} < :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.GE:
          conditionExpression += `#${name} >= :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.GT:
          conditionExpression += `#${name} > :${name}`;
          values[`:${name}`] = condition.value;
          break;
        case CriteriaOperators.BETWEEN:
          if (condition.between !== undefined) {
            conditionExpression += `#${name} between :low AND :high`;
            values[":low"] = condition.between.low;
            values[":high"] = condition.between.high;
          }
          break;
      }

      nameCode++;
    }

    let params: AWS_DDB.DocumentClient.UpdateItemInput = {
      TableName: this._table,
      Key: {
        [this._partitionKey]: item.key.partitionKeyValue,
      },

      ExpressionAttributeNames: names,
      UpdateExpression: expression,
      ReturnValues: item.returnUpdated,
    };

    if (this._sortKey !== undefined) {
      params.Key[this._sortKey] = item.key.sortKeyValue;
    }

    if (conditionExpression.length !== 0) {
      params.ConditionExpression = conditionExpression;
    }

    if (Object.entries(values).length) {
      params.ExpressionAttributeValues = values;
    }

    this.debug("%j", params);
    let success = true;

    let res = await this.documentClient
      .update(params)
      .promise()
      .catch(e => {
        success = false;

        // Check if this is just because the condition failed
        if (
          e.code === "ConditionalCheckFailedException" &&
          item.conditions !== undefined
        ) {
          return;
        }

        this.error(
          "updateItem (Table: %s) Error: (%s: %s). Params: (%j)",
          this._table,
          e.code,
          e,
          params,
        );
      });

    if (success && item.returnUpdated !== undefined && res !== undefined) {
      return <{ [key: string]: any }>res.Attributes;
    }

    return success;
  }

  async getNextAtomicCounter(
    counter: string,
    counterKey: string = DDB_COUNTER,
  ): Promise<string> {
    // Update the current value - if the counter exists
    let upParams = <UpdateItemParams>{
      key: { partitionKeyValue: counterKey, sortKeyValue: counter },
      add: { counter: 1 },
      conditions: [
        {
          attribute: counterKey,
          condition: "EXISTS",
        },
      ],
      returnUpdated: "UPDATED_NEW",
    };

    let attribs = await this.updateItem(upParams);

    if (typeof attribs === "object" && attribs[counterKey] !== undefined) {
      // return next value
      return attribs[counterKey].toString();
    }

    // Otherwise - create the counter and set it to 1
    upParams = {
      key: { partitionKeyValue: counterKey, sortKeyValue: counter },
      set: { [counterKey]: 1 },
      conditions: [
        {
          attribute: counterKey,
          condition: "NOT_EXISTS",
        },
      ],
    };

    let created = await this.updateItem(upParams);

    if (created === false) {
      return "";
    }

    return "1";
  }
}
