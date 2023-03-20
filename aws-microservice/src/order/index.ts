import {
  PutItemCommand,
  PutItemCommandInput,
  ScanCommand,
  ScanCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { EventType, Handler } from "../types";
import { ddbClient } from "./ddbClient";

export const handler: Handler<APIGatewayProxyResult> = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  console.log("Basket Event", JSON.stringify(event, null, 2));

  const eventType = event["detail-type"];

  if (event.Records) {
    return await sqsInvocation(event);
  } else if (eventType) {
    // Checking for an event raised form EventBridge
    return await eventBridgeInvocation(event);
  } else {
    return await apiGatewayInvocation(event);
  }
};

const eventBridgeInvocation = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  const eventType = event["detail-type"];
  const detail = event.detail;
  let body = "";
  try {
    switch (eventType) {
      case "CheckoutBasket": {
        body = await createOrder(detail);
        break;
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
    body,
  };
  // its for checking EventBridge rased an event
};
const apiGatewayInvocation = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  let body = "";
  try {
    switch (event.httpMethod) {
      case "GET": {
        if (event.pathParameters) {
          body = await getItem(event);
        } else {
          body = await getItems();
        }
        break;
      }
      default:
        throw new Error(`Unsupported method ${event.httpMethod}`);
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
    body: JSON.stringify(body),
  };
};

const createOrder = async (detail: any): Promise<any> => {
  console.log(`createOrder `, detail);
  try {
    detail.createdAt = new Date().toISOString();
    const input: PutItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(detail),
    };
    const data = await ddbClient.send(new PutItemCommand(input));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getItems = async (): Promise<any> => {
  console.log("getItems");
  try {
    const input: ScanCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new ScanCommand(input));
    console.log(Items);
    return Items ? Items.map((i) => unmarshall(i)) : [];
  } catch (error) {
    console.error(error);
    throw error;
  }
};
const getItem = async (event: EventType): Promise<any> => {
  console.log(`GEt Items`);
  try {
    const userName = event.pathParameters.userName || "";
    const createdAt = event.queryStringParameters.createdAt || "";
    const input: QueryCommandInput = {
      KeyConditionExpression: "userName =:userName and createdAt =:createdAt",
      ExpressionAttributeValues: {
        ":userName": {
          S: userName,
        },
        ":createdAt": {
          S: createdAt,
        },
      },
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new QueryCommand(input));
    console.log(`Get orders`, Items);
    return Items ? Items.map((i) => unmarshall(i)) : [];
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const sqsInvocation = async (event: EventType): Promise<any> => {
  try {
    event.Records?.forEach(async (record: any) => {
      const checkoutEvent = JSON.parse(record.body);
      // creating orders
      await createOrder(checkoutEvent.detail);
      // delete object should be check out basket json object
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};
