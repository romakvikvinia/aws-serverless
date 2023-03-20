import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

interface SWNMicroserviceProps {
  productTable: ITable;
  basketTable: ITable;
  orderTable: ITable;
}

export class SWNMicroservice extends Construct {
  /**
   * Product lambda function
   */
  public readonly productMicroservice: NodejsFunction;

  /**
   * Basket lambda function
   */
  public readonly basketMicroservice: NodejsFunction;

  /**
   * Order lambda function
   */
  public readonly orderMicroservice: NodejsFunction;

  constructor(scope: Construct, id: string, props: SWNMicroserviceProps) {
    super(scope, id);

    // create product Microservice
    this.productMicroservice = this.createProductFunction(props.productTable);
    // create basket Microservice
    this.basketMicroservice = this.createBasketFunction(props.basketTable);
    // create order Microservice
    this.orderMicroservice = this.createOrderFunction(props.orderTable);
  }

  createProductFunction(productTable: ITable): NodejsFunction {
    // define lambda
    const productLambdaProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-cdk"],
        minify: true,
      },
      environment: {
        PRIMARY_KEY: "id",
        DYNAMODB_TABLE_NAME: productTable.tableName,
      },
      runtime: Runtime.NODEJS_16_X,
    };

    const productMicroservice = new NodejsFunction(this, "product", {
      entry: join(__dirname, "../", "src", "product", "index.ts"),
      ...productLambdaProps,
    });

    productTable.grantReadWriteData(productMicroservice);
    return productMicroservice;
  }

  createBasketFunction(basketTable: ITable): NodejsFunction {
    // define lambda
    const productLambdaProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-cdk"],
        minify: true,
      },
      environment: {
        PRIMARY_KEY: "userName",
        DYNAMODB_TABLE_NAME: basketTable.tableName,
        EVENT_SOURCE: "com.swn.basket.checkout",
        EVENT_DETAIL_TYPE: "CheckoutBasket",
        EVENT_BUS_NAME: "SwnEventBus",
      },
      runtime: Runtime.NODEJS_16_X,
    };

    const basketMicroservice = new NodejsFunction(this, "basket", {
      entry: join(__dirname, "../", "src", "basket", "index.ts"),
      ...productLambdaProps,
    });

    basketTable.grantReadWriteData(basketMicroservice);
    return basketMicroservice;
  }
  createOrderFunction(borderTable: ITable): NodejsFunction {
    // define lambda
    const itemLambdaProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-cdk"],
        minify: true,
      },
      environment: {
        PRIMARY_KEY: "userName",
        SORT_KEY: "createdAt",
        DYNAMODB_TABLE_NAME: borderTable.tableName,
      },
      runtime: Runtime.NODEJS_16_X,
    };

    const orderMicroservice = new NodejsFunction(this, "order", {
      entry: join(__dirname, "../", "src", "order", "index.ts"),
      ...itemLambdaProps,
    });

    borderTable.grantReadWriteData(orderMicroservice);
    return orderMicroservice;
  }
}
