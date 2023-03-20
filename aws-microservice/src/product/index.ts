import { APIGatewayProxyResult } from "aws-lambda";
import { EventType, Handler } from "../types";
import { ddbClient } from "./ddbClient";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  ScanCommandInput,
  PutItemCommandInput,
  DeleteItemCommand,
  DeleteItemCommandInput,
  UpdateItemCommand,
  UpdateItemCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { v4 as uuid4 } from "uuid";

export const handler: Handler<APIGatewayProxyResult> = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  let body = "";

  try {
    switch (event.httpMethod) {
      case "GET": {
        if (
          event.pathParameters &&
          event.pathParameters.id &&
          event.queryStringParameters
        ) {
          body = await getProductsByCategory(event);
        } else if (event.pathParameters && event.pathParameters.id) {
          body = await getItem(event.pathParameters.id);
        } else {
          body = await getItems();
        }
        break;
      }

      case "POST": {
        body = await createItem(event);
        break;
      }

      case "PATCH": {
        body = await updateItem(event);
        break;
      }

      case "DELETE": {
        body = await deleteItem(event.pathParameters.id!);
        break;
      }

      default: {
        throw new Error(`Unsupported method ${event.httpMethod}`);
      }
    }
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to perform operation",
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
  }
  console.log(body);
  return {
    statusCode: 200,
    // headers: {
    //   "Content-Type": "application/json",
    // },
    body: JSON.stringify(body),
  };
};

const getItems = async (): Promise<any> => {
  try {
    const params: ScanCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new ScanCommand(params));
    return Items ? Items.map((i) => unmarshall(i)) : [];
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getItem = async (id: string): Promise<any> => {
  console.log("Get Item", id);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id }),
    };
    const { Item } = await ddbClient.send(new GetItemCommand(params));
    console.log(`Found ${id} `, Item);
    return Item ? unmarshall(Item) : null;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getProductsByCategory = async (event: EventType): Promise<any> => {
  console.log("getProductsByCategory event", event);
  try {
    const id = event.pathParameters.id;
    const category = event.queryStringParameters?.category;
    const params: QueryCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      KeyConditionExpression: "id = :productId",
      FilterExpression: "contains(category,:category)",
      ExpressionAttributeValues: {
        ":productId": {
          S: id!,
        },
        ":category": { S: category! },
      },
    };
    const { Items } = await ddbClient.send(new QueryCommand(params));
    console.log(Items);
    return Items ? Items.map((i) => unmarshall(i)) : [];
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const createItem = async (event: EventType): Promise<any> => {
  console.log("createItem event", event);
  try {
    const request = event.body ? JSON.parse(event.body) : {};
    request.id = uuid4();
    const input: PutItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(request),
      // ExpressionAttributeNames: {
      //   "#updatedAt": "updated_at",
      // },
      // ExpressionAttributeValues: {
      //   ":ts": { N: new Date().getTime() },
      // },
    };

    const data = await ddbClient.send(new PutItemCommand(input));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const updateItem = async (event: EventType): Promise<any> => {
  console.log("updateItem event", event);
  try {
    const id = event.pathParameters.id;
    const body = JSON.parse(event.body!);
    const objectKeys = Object.keys(body);

    console.log(
      `Update Product function. requestBoyd ${body},  keys: ${objectKeys}`
    );

    const params: UpdateItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id }),
      ExpressionAttributeNames: objectKeys.reduce(
        (acc, key, index) => ({ ...acc, [`#Key${index}`]: key }),
        {}
      ),
      ExpressionAttributeValues: marshall(
        objectKeys.reduce(
          (acc, key, index) => ({
            ...acc,
            [`:value${index}`]: body[key],
          }),
          {}
        )
      ),
      UpdateExpression: `SET ${objectKeys.map(
        (_, index) => `#Key${index} = :value${index}`
      )}`,

      ReturnValues: "ALL_NEW",
    };

    const data = await ddbClient.send(new UpdateItemCommand(params));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteItem = async (id: string): Promise<any> => {
  console.log(`Delete product by id : ${id} `);
  try {
    const params: DeleteItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id }),
    };
    const data = await ddbClient.send(new DeleteItemCommand(params));
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
