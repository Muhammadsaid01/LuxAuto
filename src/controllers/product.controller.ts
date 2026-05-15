import { Request, Response } from 'express';
import { ProductCollection } from '../libs/enums/product.enum';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { T } from "../libs/types/common";
import { AdminRequest, ExtendedRequest } from '../libs/types/member';
import { ProductInput, ProductInquery } from '../libs/types/product';
import ProductService from '../models/Product.service';

const productService = new ProductService();
const productController: T = {};

	/* SPA */

	productController.getProducts = async (req:Request, res:Response) => {
		try{
		console.log("GetProducts  ");
		const {page, limit, order, productCollection, search} = req.query;
		const inquery:ProductInquery = {
			order: String(order),
			page: Number(page),
			limit: Number(limit),
		};

		if(productCollection){
			inquery.productCollection = productCollection as ProductCollection;
		} 

		if(search) inquery.search = String(search);
		const result = await productService.getProducts(inquery);
		

		res.status(HttpCode.OK).json(result);
	}catch(err){
		console.log("Error GetProducts:", err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
	};


	productController.getProduct = async (req:ExtendedRequest, res:Response) => {
		try{
			console.log("getProduct  ");
			const { id } = req.params;
			
			const memberId = req.member?._id ?? null;
			const result = await productService.getProduct(memberId, id as string);

		res.status(HttpCode.OK).json(result);
	}catch(err){
		console.log("Error getProduct:", err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
	};

	/*BSSR */

// Get All Products

productController.getAllProducts = async (req:Request, res:Response)=> {
	try{
		console.log("Get All Products");
		const data = await productService.getAllProducts();
		console.log("products:", data);
			res.render("products", {products: data});
	}catch(err){
		console.log("Error Get All Products:", err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};
// Create New Products

productController.createNewProduct = async (req:AdminRequest, res:Response)=> {
	try{
		console.log("BODY =>", req.body);
		console.log("Create New Products");
		console.log("req.file:", req.files);

		if(!req.files?.length)
			throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.CREATED_FAILED);

		const data :ProductInput = req.body;
		data.productImages = req.files?.map(ele =>{
			return ele.path.replace(/\\/g, '/' );
		});
		
		await productService.createNewProduct(data);
		res.send(`
  <script>
    alert("Successful creation!");
    window.location.replace('/admin/product/all');
  </script>
`);
	}catch(err){
		console.log("Error Create New Products:", err);
		const message = 
		err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
		res.send(`<script> alert("${message}"); window.replace('admin/product/all') </script>`);
	}
};

 // Update chosen product
productController.updateChosenProduct = async (req:Request, res:Response)=> {
	try{
		console.log("updateChosenProduct");
		const id = req.params.id as string;
		console.log(id);
		
		const result = await productService.updateChosenProduct(id, req.body);

		res.status(HttpCode.OK).json({data: result});
	}catch(err){
		console.log("Error updateChosenProduct:", err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};


export default productController;