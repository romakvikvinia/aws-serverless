import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

interface SWNSqsProps {
  consumer: IFunction;
}

export class SwnQueue extends Construct {
  // order queue
  public readonly orderQueue: IQueue;
  constructor(scope: Construct, id: string, props: SWNSqsProps) {
    super(scope, id);
    // order queue creation
    this.orderQueue = this.createOrderQueue(props.consumer);
  }

  createOrderQueue(consumer: IFunction) {
    // create queue
    const queue = new Queue(this, "OrderQueue", {
      queueName: "Order-Queue",
      visibilityTimeout: Duration.seconds(30), // default value
    });
    // set pulling event source mapping
    consumer.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1, // event quantity  number of events that receives lambda function
      })
    );

    return queue;
  }
}
