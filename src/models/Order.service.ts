import mongoose, { isValidObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { OrderStatus } from "../libs/enums/order.enum";
import { ProductStatus } from "../libs/enums/product.enum";
import { MemberStatus, MemberType } from "../libs/enums/Member.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { Member } from "../libs/types/member";
import { Order, OrderInquiry, OrderItemInput, OrderUpdateInput } from "../libs/types/order";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import ProductModel from "../schema/Product.model";
import MemberModel from "../schema/Member.model";

const badOrder = () => new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);

class OrderService {
  private readonly orderModel = OrderModel;

  public async createOrder(member: Member, input: OrderItemInput[]): Promise<Order> {
    if (!Array.isArray(input) || !input.length || input.length > 100) throw badOrder();
    const ids = new Set<string>();
    for (const item of input) {
      if (!item || !isValidObjectId(item.productId) || typeof item.itemQuantity !== "number" ||
          !Number.isSafeInteger(item.itemQuantity) || item.itemQuantity < 1 || item.itemQuantity > 100 ||
          ids.has(String(item.productId))) throw badOrder();
      ids.add(String(item.productId));
    }
    const session = await mongoose.startSession();
    try {
      let result: Order | undefined;
      await session.withTransaction(async () => {
        const products = await ProductModel.find({ _id: { $in: [...ids] }, productStatus: ProductStatus.ACTIVE })
          .session(session).lean().exec();
        if (products.length !== ids.size) throw badOrder();
        const items = input.map(item => {
          const product = products.find(p => String(p._id) === String(item.productId))!;
          const cents = Math.round(product.productPrice * 100);
          if (!Number.isSafeInteger(cents) || cents <= 0) throw badOrder();
          return { productId: product._id, itemQuantity: Number(item.itemQuantity), itemPrice: cents / 100 };
        });
        const amountCents = items.reduce((sum, item) => sum + Math.round(item.itemPrice * 100) * item.itemQuantity, 0);
        if (!Number.isSafeInteger(amountCents) || !Number.isSafeInteger(amountCents + 500)) throw badOrder();
        const deliveryCents = amountCents < 10000 ? 500 : 0;
        const [order] = await OrderModel.create([{
          memberId: member._id, orderTotal: (amountCents + deliveryCents) / 100,
          orderDelivery: deliveryCents / 100,
        }], { session });
        await OrderItemModel.insertMany(items.map(item => ({ ...item, orderId: order._id })), { session });
        result = order.toObject() as unknown as Order;
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

		public async getMyOrders(member: Member, inquiry: OrderInquiry): Promise<Order[]> {
			const memberId = shapeIntoMongooseObjectId(member._id);
			const matches = {memberId: memberId, orderStatus: inquiry.orderStatus};

			const result = await this.orderModel.aggregate([
				{$match: matches},
				{$sort: {updatedAt: -1}},
				{$skip: (inquiry.page - 1) * inquiry.limit},
				{$limit: inquiry.limit},
				{
					$lookup: {
						from: "orderitems",
						localField: "_id",
						foreignField: "orderId",
						as: "orderItems",
					},
				},
				{
					$lookup: {
						from: "products",
						localField:"orderItems.productId",
						foreignField: "_id",
						as: "productData",
					}
				}

			]).exec();

			if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
			return result;
		}

  public async updateOrder(member: Member, input: OrderUpdateInput): Promise<Order> {
    const previous: Partial<Record<OrderStatus, OrderStatus>> = {
      [OrderStatus.PROCESS]: OrderStatus.PENDING,
      [OrderStatus.DELETE]: OrderStatus.PENDING,
      [OrderStatus.FINISH]: OrderStatus.PROCESS,
    };
    if (!input || !isValidObjectId(input.orderId) || !Object.prototype.hasOwnProperty.call(previous, input.orderStatus)) throw badOrder();
    const session = await mongoose.startSession();
    try {
      let result: Order | undefined;
      await session.withTransaction(async () => {
        // The compare-and-set and points update commit together. A retry never awards twice.
        const order = await OrderModel.findOneAndUpdate({
          _id: input.orderId, memberId: member._id, orderStatus: previous[input.orderStatus],
        }, { $set: { orderStatus: input.orderStatus } }, { new: true, runValidators: true, session }).exec();
        if (!order) {
          const current = await OrderModel.findOne({ _id: input.orderId, memberId: member._id }).session(session).exec();
          if (!current || current.orderStatus !== input.orderStatus) throw badOrder();
          result = current.toObject() as unknown as Order;
          return;
        }
        if (input.orderStatus === OrderStatus.PROCESS) {
          await MemberModel.updateOne({ _id: member._id, memberType: MemberType.USER, memberStatus: MemberStatus.ACTIVE },
            { $inc: { memberPoints: 1 } }, { session }).exec();
        }
        result = order.toObject() as unknown as Order;
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }
}
export default OrderService;
