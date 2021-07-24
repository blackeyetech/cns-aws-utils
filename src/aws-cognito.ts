// imports here
import * as Aws from "./aws-base";
import AWS_CongitoIdentityServiceProvider from "aws-sdk/clients/cognitoidentityserviceprovider";

// import AWS from "aws-sdk/global";
// AWS.config.logger = console;

// Interfaces here
export interface Opts extends Aws.Opts {
  poolId: string;
}

export interface UserAttrib {
  attribute: string;
  value: string;
}

// Class CognitoUserPool here
export class CognitoUserPool extends Aws.Base {
  // Properties here
  private _poolId: string;
  private _userPool: AWS_CongitoIdentityServiceProvider;

  // Constructor here
  constructor(name: string, opts: Opts) {
    super(name, opts);

    this._poolId = opts.poolId;

    this._userPool = new AWS_CongitoIdentityServiceProvider({
      region: this._region,
      apiVersion: "2016-04-18",
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

  async getUsers(
    paginationToken?: string,
  ): Promise<AWS_CongitoIdentityServiceProvider.UsersListType> {
    let res = await this._userPool
      .listUsers({
        UserPoolId: this._poolId,
        PaginationToken: paginationToken,
      })
      .promise()
      .catch(e => {
        this.error(
          "getUsers - PoolId (%s) Error: (%s: %s)",
          this._poolId,
          e.code,
          e,
        );
      });

    if (res === undefined || res.Users === undefined) {
      return [];
    }

    let users = res.Users;

    // If there are more results to get then go get them
    if (res.PaginationToken !== undefined) {
      let others = await this.getUsers(res.PaginationToken);
      users = [...users, ...others];
    }

    return users;
  }

  async createUser(
    userName: string,
    userAtribs: UserAttrib[],
  ): Promise<boolean> {
    let attribs = userAtribs.map(el => {
      return { Name: el.attribute, Value: el.value };
    });

    let res = await this._userPool
      .adminCreateUser({
        UserPoolId: this._poolId,
        Username: userName,
        UserAttributes: attribs,
        ForceAliasCreation: true,
        DesiredDeliveryMediums: ["EMAIL"],
      })
      .promise()
      .catch(e => {
        this.error(
          "createUser - PoolId: (%s) Error: (%s: %s)",
          this._poolId,
          e.code,
          e,
        );
      });

    if (res === undefined) {
      return false;
    }

    return true;
  }

  async deleteUser(userName: string): Promise<boolean> {
    let res = await this._userPool
      .adminDeleteUser({
        UserPoolId: this._poolId,
        Username: userName,
      })
      .promise()
      .catch(e => {
        this.error(
          "deleteUser - PoolId: (%s) Error: (%s: %s)",
          this._poolId,
          e.code,
          e,
        );
      });

    if (res === undefined) {
      return false;
    }

    return true;
  }

  async changeUserPassword(
    userName: string,
    password: string,
  ): Promise<boolean> {
    let res = await this._userPool
      .adminSetUserPassword({
        UserPoolId: this._poolId,
        Username: userName,
        Password: password,
        Permanent: true,
      })
      .promise()
      .catch(e => {
        this.error(
          "changeUserPassword - PoolId: (%s) Error: (%s: %s)",
          this._poolId,
          e.code,
          e,
        );
      });

    if (res === undefined) {
      return false;
    }

    return true;
  }
}
