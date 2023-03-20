import { RemovalPolicy } from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ITable,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class SWNDatabase extends Construct {
  /**
   * product table instance for using from here
   */
  public readonly productTable: ITable;
  /**
   * basket table instance for using from here
   */
  public readonly basketTable: ITable;

  /**
   * order table instance for using from here
   */
  public readonly orderTable: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Create Product Table
    this.productTable = this.createProductTable();
    // Create Basket Table
    this.basketTable = this.createBasketTable();
    // Create Basket Table
    this.orderTable = this.createOrderTable();
  }

  createProductTable(): ITable {
    /**
     * PRODUCT TABLE instance
     * PK: id
     * name
     * description
     * image
     * price
     * category
     * */

    return new Table(this, "products", {
      tableName: "products",
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY, // it means cdk destroy will delete this table
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
  createBasketTable(): ITable {
    /**
     * BASKET TABLE instance
     * PK: id
     * userId
     * items: [   SET-MAP (object)
     *      {
     *          quantity: 0,
     *          color: 0,
     *          price: 0,
     *          productId: 0,
     *          productName: 0
     *      }
     * ]
     */

    return new Table(this, "baskets", {
      tableName: "baskets",
      partitionKey: {
        name: "userName",
        type: AttributeType.STRING,
      },
      //   sortKey: {
      //     name: "userId",
      //     type: AttributeType.STRING,
      //   },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
  createOrderTable(): ITable {
    /**
     * ORDERS TABLE instance
     * PK: userName
     * SK: createdAt
     * totalPrice
     * firstName
     * lastName
     * email
     * address
     * cardInfo
     * paymentMethod
     * */

    return new Table(this, "orders", {
      tableName: "orders",
      partitionKey: {
        name: "userName",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "createdAt",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
}
