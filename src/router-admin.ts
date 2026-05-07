import express from 'express';
import dealershipController from './controllers/dealership.controller';
import productController from './controllers/product.controller';
import makeUploader from './libs/utils/uploader';
const routerAdmin = express.Router();

/** Restaurant Routes */

// Home Route
routerAdmin.get('/', dealershipController.goHome);

// Signup Route
routerAdmin
.get('/signup',dealershipController.getSignup)
.post('/signup', makeUploader('members').single('memberImage'),
dealershipController.processSignup);
// Login Route
routerAdmin
.get('/login',dealershipController.getLogin )
.post('/login',dealershipController.processLogin );
// Logout Route
routerAdmin
.get('/logout',dealershipController.logout);
// Check Me Route
routerAdmin.get('/check-me',dealershipController.checkMe );

/** Product Routes   */

routerAdmin.get('/product/all',
	 dealershipController.verifyAdmin,
	 productController.getAllProducts
	);
	routerAdmin.post('/product/create',
		 dealershipController.verifyAdmin,
		makeUploader('products').array('productImages', 5),
		  productController.createNewProduct
		);
	routerAdmin.post('/product/:id',
		 dealershipController.verifyAdmin, 
		 productController.updateChosenProduct
		);	
/** User Routes   */	
routerAdmin.get("/user/all", dealershipController.verifyAdmin, dealershipController.getUsers);
routerAdmin.post("/user/edit", dealershipController.verifyAdmin, dealershipController.updateChosenUser);
export default routerAdmin;