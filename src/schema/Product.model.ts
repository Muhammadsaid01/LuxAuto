import mongoose, { Schema } from 'mongoose';
import { ProductCategory, ProductCollection, ProductCondition, ProductStatus } from '../libs/enums/product.enum';

const productSchema = new Schema({
	productStatus: {
		type: String,
		enum: ProductStatus,
		default: ProductStatus.ACTIVE,
	},

	productName: {
		type: String,
		required: true,
	},

	productPrice: {
		type: Number,
		required: true,
	},

	productCategory: {
		type:String,
		enum: ProductCategory,
		default: ProductCategory.GASOLINE,
	},

	productCondition: {
		type: String,
		enum: ProductCondition,
		default: ProductCondition.NEW,
	}, 
	productCollection:{
		type: String,
		enum: ProductCollection,
		required: true,
	},
	productDesc: {
		type: String,
		required: true,
	},

	productImages: {
		type: [String],
		default: [],
	},

	productMileage: {
		type: Number,
		required: true,
	},
	productYear: {
		type: Number,
		required: true,
	},
	 productViews: {
		type: Number,
		default: 0,
	 }


},{ timestamps: true } // createdAt, updatedAt
);
	
export default mongoose.model('Product', productSchema);