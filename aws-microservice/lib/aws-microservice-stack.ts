import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import { SWNApiGateway } from "./apigateway";
import { SWNDatabase } from "./database";
import { SWNEventBus } from "./eventBus";
import { SWNMicroservice } from "./microservice";
import { SwnQueue } from "./queue";

export class AwsMicroserviceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // set up database
    const database = new SWNDatabase(this, "Database");

    // lambda configuration
    const microservice = new SWNMicroservice(this, "Microservice", {
      productTable: database.productTable,
      basketTable: database.basketTable,
      orderTable: database.orderTable,
    });

    // microservice ApiGateways
    const apiGateway = new SWNApiGateway(this, "ApiGateway", {
      productMicroservice: microservice.productMicroservice,
      basketMicroservice: microservice.basketMicroservice,
      orderMicroservice: microservice.orderMicroservice,
    });

    // queue
    const queue = new SwnQueue(this, "OrderQueue", {
      consumer: microservice.orderMicroservice,
    });

    // Event Bus
    const eventBus = new SWNEventBus(this, "EventBus", {
      publisherFunction: microservice.basketMicroservice,
      // subscribeFunction: microservice.orderMicroservice,
      subscribeQueue: queue.orderQueue,
    });
  }
}
