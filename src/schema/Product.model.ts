import { ProductCategory, ProductCondition, ProductEngineType, ProductStatus, ProductType } from 'libs/enums/product.enum';
import mongoose, { Schema } from 'mongoose';

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
	productEngine: {
		type: String,
		enum: ProductEngineType,
		default: ProductEngineType.SINGLE,
	},

	productType:{
		type: String,
		enum: ProductType,
		default: ProductType.SEDAN,
	},



	productDesc: {
		type: String,
		required: true,
	},

	productImage: {
		type: String,
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