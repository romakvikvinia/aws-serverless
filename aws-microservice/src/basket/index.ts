import { APIGatewayProxyResult } from "aws-lambda";
import { CheckOutEventType, EventType, Handler, IItem } from "../types";
import { ddbClient } from "./ddbClient";
import {
  DeleteItemCommand,
  DeleteItemCommandInput,
  GetItemCommand,
  GetItemCommandInput,
  PutItemCommand,
  PutItemCommandInput,
  ScanCommand,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ebClient } from "./eventBridgeClient";
import {
  PutEventsCommand,
  PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";

export const handler: Handler<APIGatewayProxyResult> = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  console.log("Basket Event", JSON.stringify(event, null, 2));
  let body;

  try {
    switch (event.httpMethod) {
      case "GET": {
        if (event.pathParameters && event.pathParameters.userName) {
          body = await getItem(event.pathParameters.userName);
        } else {
          body = await getItems();
        }
        break;
      }

      case "POST": {
        if (event.path === "/basket/checkout") {
          let neeEvent = event as unknown as CheckOutEventType;
          body = await checkoutBasket(neeEvent);
        } else {
          body = await createBasket(event);
        }
        break;
      }

      case "DELETE": {
        body = await deleteBasket(event.pathParameters.userName!);
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Operation finished ${event.httpMethod}`,
      body,
    }),
  };
};

// find all
const getItems = async (): Promise<any> => {
  console.log("Get all baskets");
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

// find single basket
const getItem = async (userName: string): Promise<IItem> => {
  console.log("Get single baskets");
  try {
    const params: GetItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ userName }),
    };
    const { Item } = await ddbClient.send(new GetItemCommand(params));
    console.log(`Found ${userName} `, Item);

    return Item ? unmarshall(Item) : null;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
// create basket
const createBasket = async (event: EventType): Promise<any> => {
  console.log("create Basket ", event);
  const requestBody = event.body ? JSON.parse(event.body) : {};
  console.log("Body", requestBody);
  try {
    const input: PutItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall({
        ...requestBody,
      }),
    };
    const data = await ddbClient.send(new PutItemCommand(input));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
// delete basket
const deleteBasket = async (userName: string): Promise<any> => {
  console.log("delete Basket ", userName);
  try {
    const input: DeleteItemCommandInput = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        userName: { S: userName },
      },
    };
    const data = await ddbClient.send(new DeleteItemCommand(input));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const checkoutBasket = async (event: CheckOutEventType): Promise<any> => {
  console.log("checkout  Basket ", event);
  const request = JSON.parse(event.body) as CheckOutEventType["body"];

  if (!request || !request.userName) {
    throw new Error(
      `userName should exist in request ${JSON.stringify(request, null, 2)}`
    );
  }

  try {
    // 1 get existing basket
    const basket = await getItem(request.userName);
    // 2 create an event object with basket items
    // 3 calculate total price , prepare order create json data to send ordering
    const payload = await prepareOrderPayload(request, basket);

    // 4 publish an event to eventBridge
    const publishEvent = await publishCheckoutBasketEvent(payload);
    // 5 remove existing basket

    await deleteBasket(request.userName);

    return publishEvent;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const prepareOrderPayload = async (
  request: CheckOutEventType["body"],
  basket: any
): Promise<CheckOutEventType["body"]> => {
  console.log("prepareOrderPayload", request, basket);

  if (!basket || !basket.items) {
    throw new Error(`basket should exists in items ${basket}`);
  }
  //
  let totalPrice = basket.items.reduce(
    (acc: number, i: any) => acc + i.price,
    0
  );

  request.totalPrice = totalPrice;
  // copies from basket into request
  Object.assign(request, basket);
  console.log(`Success prepareOrderPayload`, request);
  return request;
};

const publishCheckoutBasketEvent = async (
  request: CheckOutEventType["body"]
) => {
  const input: PutEventsCommandInput = {
    Entries: [
      {
        Source: process.env.EVENT_SOURCE,
        DetailType: process.env.EVENT_DETAIL_TYPE,
        EventBusName: process.env.EVENT_BUS_NAME,
        Detail: JSON.stringify({
          userName: request.userName,
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          address: request.address,
          cardInfo: request.cardInfo,
          paymentMethod: request.paymentMethod,
          totalPrice: request.totalPrice,
          items: request.items,
        }),
      },
    ],
  };
  const data = await ebClient.send(new PutEventsCommand(input));
  console.log(`Success, Event Sended `, data);
  return data;
};
