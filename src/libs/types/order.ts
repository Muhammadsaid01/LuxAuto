import { ObjectId } from "mongoose";
import { OrderStatus } from '../enums/order.enum';
import { Product } from './product';

export interface OrderItem {
	_id: ObjectId;
	orderTotal:Number;
	orderDelivery:number;
	productId: ObjectId;
	memberId: ObjectId;
	orderId:ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

export interface Order {
	_id: ObjectId;
	orderTotal:Number;
	orderDelivery:number;
	orderStatus: OrderStatus;
	memberId: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	/** from aggregations **/
	orderItems: OrderItem[];
	productData: Product[];
}   

export interface OrderItemInput {
	itemQuantity: Number;
	itemPrice: Number;
	productId: ObjectId;
	orderId?:ObjectId;
}

export interface OrderInquiry {
	page: number;
	limit:number;
	orderStatus: OrderStatus;
}

export interface OrderUpdateInput {
	orderId: string;
	orderStatus: OrderStatus;
}