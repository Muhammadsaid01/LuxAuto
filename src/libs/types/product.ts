import { ObjectId } from "mongoose";

import {
	ProductCategory,
	ProductCollection,
	ProductCondition,
	ProductEngineType,
	ProductStatus,
} from "../enums/product.enum";

export interface Product {
  _id: ObjectId;
  productStatus: ProductStatus;
  productCollection: ProductCollection;
  productName: string;
  productPrice: number;
  productCategory: ProductCategory;
  productCondition: ProductCondition;
  productEngine: ProductEngineType;
	productYear: number;
	productMileage: number;
  productDesc?: string;
  productImages: string[];
  productViews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInquery {
  order: string,
  page: number;
  limit: number;
  productCollection?: ProductCollection;
  search?: string;
}

export interface ProductInput {
  productStatus?: ProductStatus;
  productCollection: ProductCollection;
  productName: string;
  productPrice: number;
  productYear: number;
  productMileage: number;
	productCategory?: ProductCategory;
  productCondition?: ProductCondition;
  productEngine?: ProductEngineType;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}

export interface ProductUpdateInput {
  _id: ObjectId;
  productStatus?: ProductStatus;
  productCollection?: ProductCollection;
  productName?: string;
	productCategory?: ProductCategory;
  productPrice?: number;
  productYear?: number;
  productMileage?: number;
  productCondition?: ProductCondition;
  productEngine?: ProductEngineType;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}
