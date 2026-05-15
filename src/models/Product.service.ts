import { ObjectId } from "mongoose";
import { shapeIntoMongooseObjectId } from '../libs/config';
import { ProductStatus } from '../libs/enums/product.enum';
import { ViewGroup } from '../libs/enums/view.enum';
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from '../libs/types/common';
import {
  Product,
  ProductInput,
  ProductInquery,
  ProductUpdateInput
} from "../libs/types/product";
import { ViewInput } from '../libs/types/view';
import ProductModel from "../schema/Product.model";
import ViewService from './View.service';

class ProductService {

	private readonly productModel;
  public viewService;

	constructor() {
		this.productModel = ProductModel;
    this.viewService = new ViewService();
	}

	/* SPA */

  public async getProducts(inquery: ProductInquery) :  Promise<Product[]> {
    const match:T = {productStatus: ProductStatus.ACTIVE};
    if(inquery.productCollection)
      match.productCollection = inquery.productCollection;
    if(inquery.search){
      match.productName = {$regex: new RegExp(inquery.search, "i") }
    };
    const sort:T = inquery.order === "productPrice" 
    ? {[inquery.order]: 1} 
    : {[inquery.order]: -1};

    const result  = await this.productModel.aggregate([
      {$match: match},
      {$sort: sort},
       {$skip: (inquery.page - 1) * inquery.limit},
       {$limit: inquery.limit },
    ]).exec();

    if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NOT_FOUND);

    return result;
  }

  public async getProduct(memberId: ObjectId | null , id : string): Promise<Product> {

    const productId = shapeIntoMongooseObjectId(id);

    let result = await this.productModel.findOne({_id: productId, productStatus​ : ProductStatus.ACTIVE}).exec();

     if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NOT_FOUND);
    if(memberId) {
      // Check  Existence
      const input: ViewInput = {
        memberId: memberId,
        viewRefId: productId,
        viewGroup: ViewGroup.PRODUCT,

      }
      const existView = await  this.viewService.checkViewExistence(input);
      console.log("exist:", existView);
      if(!existView) {
        // Insert View 
        console.log("PLANNING TO INSERT NEW VIEW");
        await this.viewService.insertMemberView(input);
        // Increase Counts
        result = await this.productModel.findByIdAndUpdate(productId, 
          {$inc: { productViews: +1 }}, 
          {new:true},

        ).exec();
      }
    }
		//@ts-ignore
    return result;
  }

	/*BSSR */

 public async getAllProducts(): Promise<Product[]> {
    const result = await this.productModel.find().exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
// @ts-ignore
    return result;
  }

  public async createNewProduct(input: ProductInput): Promise<Product> {
    try {
			
      const result = await this.productModel.create(input);
      return result.toObject()  as Product;
    } catch (err) {
      console.error("Error, model:createNewProduct:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
    }
  }

  public async updateChosenProduct(
    id: string,
    input: ProductUpdateInput,
  ): Promise<Product> {
		
    id = shapeIntoMongooseObjectId(id);
    const result = await this.productModel
      .findOneAndUpdate({ _id: id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
		//@ts-ignore
    return result;
  }

}


export default ProductService;