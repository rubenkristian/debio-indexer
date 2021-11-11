import { BlockMetaData } from "src/substrate/models/blockMetaData";
import { Orders } from "../../models/orders";

export class OrderFulfilledCommand {
  orders: Orders;
  constructor(data: Array<Orders>, public readonly blockMetaData: BlockMetaData) {
    this.orders = data[0];
  }
}
