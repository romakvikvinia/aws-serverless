import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import {
  // LambdaFunction,
  SqsQueue,
} from "aws-cdk-lib/aws-events-targets";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

interface SWNEventBusProps {
  publisherFunction: IFunction;
  // subscribeFunction: IQueue;
  subscribeQueue: IQueue;
}

export class SWNEventBus extends Construct {
  constructor(scope: Construct, id: string, props: SWNEventBusProps) {
    super(scope, id);

    // Event Bus
    const eventBus = new EventBus(this, "SWNEventBus", {
      eventBusName: "SwnEventBus",
    });

    const checkoutBasketRule = new Rule(this, "SWNCheckoutBasketRule", {
      eventBus: eventBus,
      enabled: true,
      description:
        "When the basket microservice will raise checkout of the basket",
      eventPattern: {
        source: ["com.swn.basket.checkout"],
        detailType: ["CheckoutBasket"],
      },
      ruleName: "CheckoutBasketRule",
    });
    // needs to pass target
    // it's order microservice that will receive event from basket

    /**
     * Lambda function targeting from event bus
     */
    // checkoutBasketRule.addTarget(new LambdaFunction(props.subscribeFunction));

    /**
     * Queue targeting from event bus
     */
    checkoutBasketRule.addTarget(new SqsQueue(props.subscribeQueue));

    // Give required permissions to publisher
    // in our case basket microservice
    eventBus.grantPutEventsTo(props.publisherFunction);
  }
}
