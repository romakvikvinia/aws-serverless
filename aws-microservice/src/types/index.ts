import {
  APIGatewayProxyEvent,
  AttributeValue,
  Handler as AWSHandler,
} from "aws-lambda";

export type EventType = APIGatewayProxyEvent & {
  Records?: any[];
  pathParameters: {
    id?: string;
    userName?: string;
  };
  queryStringParameters: {
    createdAt?: string;
  };
  "detail-type"?: string;
  detail: any;
};

export type Handler<T> = AWSHandler<EventType, T>;

export type CheckOutEventType = APIGatewayProxyEvent & {
  body: {
    userName: string;
    totalPrice: number;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    cardInfo: string;
    paymentMethod: number;
    items?: any[];
  };
};

export type IItem = Record<string, AttributeValue> | null;
