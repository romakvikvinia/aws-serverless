import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface SWNApiGatewayProps {
  productMicroservice: IFunction;
  basketMicroservice: IFunction;
  orderMicroservice: IFunction;
}
export class SWNApiGateway extends Construct {
  // Product Api Gateway
  public readonly productRestApi: LambdaRestApi;
  public readonly basketRestApi: LambdaRestApi;
  public readonly orderRestApi: LambdaRestApi;
  constructor(scope: Construct, id: string, props: SWNApiGatewayProps) {
    super(scope, id);
    // create Product ApiGateway
    this.productRestApi = this.createProductApiGateway(
      props.productMicroservice
    );
    // create Product ApiGateway
    this.basketRestApi = this.createBasketApiGateway(props.basketMicroservice);
    // create Order ApiGateway
    this.orderRestApi = this.createOrderApiGateway(props.orderMicroservice);
  }

  createProductApiGateway(productMicroservice: IFunction) {
    // create rest lambda API
    const api = new LambdaRestApi(this, "productApi", {
      restApiName: "Product Service",
      handler: productMicroservice,
      proxy: false,
    });

    const products = api.root.addResource("product");
    // products
    // GET /product
    // POST /product
    products.addMethod("GET");
    products.addMethod("POST");

    // GET /product/{id}
    // PUT /product/{id}
    // DELETE /product/{id}

    const product = products.addResource("{id}");
    product.addMethod("PATCH");
    product.addMethod("GET");
    product.addMethod("DELETE");
    return api;
  }
  createBasketApiGateway(basketMicroservice: IFunction) {
    // Basket microservice api gateway
    // root name = basket

    const api = new LambdaRestApi(this, "basketAPI", {
      restApiName: "Basket Service",
      handler: basketMicroservice,
      proxy: false,
    });

    const baskets = api.root.addResource("basket");
    // basket
    // GET /basket
    // POST /basket
    baskets.addMethod("GET");
    baskets.addMethod("POST");
    // resource name basket/{userName}
    // GET /basket/{userName}
    // DELETE /basket/{userName}

    const basket = baskets.addResource("{userName}");
    basket.addMethod("GET");
    basket.addMethod("DELETE");

    // POST  basket/checkout async flow
    const checkout = baskets.addResource("checkout");
    checkout.addMethod("POST");
    // payload {userName:"swn"}

    return api;
  }
  createOrderApiGateway(orderMicroservice: IFunction) {
    // Basket microservice api gateway
    // root name = basket

    const api = new LambdaRestApi(this, "orderAPI", {
      restApiName: "Order Service",
      handler: orderMicroservice,
      proxy: false,
    });

    const orders = api.root.addResource("order");
    // order
    // GET /order

    orders.addMethod("GET");

    // GET /order/{userName}

    const order = orders.addResource("{userName}");
    // GET /order/{userName}?createdAt=timestamp
    order.addMethod("GET");
    return api;
  }
}
