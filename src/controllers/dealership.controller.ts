import { NextFunction, Request, Response } from 'express';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { MemberType } from '../libs/enums/Member.enum';
import { T } from '../libs/types/common';
import { AdminRequest, LoginInput } from '../libs/types/member';
import MemberService from '../models/Member.service';
const memberService = new MemberService();
// HomePage
const dealershipController: T = {};

dealershipController.getHomePage = (req: Request , res: Response) => {
	 try {
		console.log("home page");
		res.render("home");
	 }catch (err) {
		console.log("Error in getHomePage: ", err);
		res.redirect("/admin");
	 }
};

//Signup
dealershipController.getSignup = (req: Request , res: Response) => {
	 try {
		console.log("signup page");
		res.render("signup");
	 }catch (err) {
		console.log("Error in getSignup: ", err);
		res.redirect("/admin");
	 }
};

//Login 
dealershipController.getLogin = (req: Request, res:Response) => {
    try {
     res.render("login");
    } catch (err){
        console.log("Error getLogin:" ,err);
          res.redirect('/admin'); 
    }  
};


dealershipController.processSignup = async (req: Request , res: Response) => {
	 try {
		console.log("process signup");
		const file = req.file;
		if(!file) 
			throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
		const newMember =  req.body;
		newMember.MemberImage = file?.path.replace(/\\/g, "/");
		newMember.memberType = MemberType.ADMIN;
		const result = await memberService.processSignup(newMember);
		// res.session.member = result;
		// res.session.save(function() {
		// 	res.redirect("/admin/product/all");
		// });
		res.send(`<script>alert("회원가입이 완료되었습니다."); window.location.href="/admin/product/all";</script>`);
	 }catch (err) {
		console.log("Error in processSignup: ", err);
		const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
		res.send(`<script>alert("${message}"); window.location.href="/admin/signup";</script>`);

	 }
};

// Process Login
dealershipController.processLogin = async (req: AdminRequest, res:Response) => {
    try {
        console.log("processLogin");
        const input: LoginInput = req.body;
        const result = await memberService.processLogin(input);



       req.session.member = result;
       req.session.save(function(){
            res.redirect("/admin/product/all"); 
       });
        
    } catch (err){
        console.log("Error processLogin:" ,err);
        const message =
         err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
         res.send(`<script>alert('${message}'); window.location.replace('/admin/login');</script>`);
    }  
};
dealershipController.logout = async (req: AdminRequest, res:Response) => {
    try {
        console.log("logout");
       req.session.destroy(function(){
        res.redirect('/admin');   

       });
    } catch (err){
        console.log("Error logout:" ,err);
        res.redirect('/admin'); 
    }  
};

//Users
dealershipController.getUsers= async (req: Request, res:Response) => {
    try {
        console.log("getUsers");
        const result = await memberService.getUsers();
        res.render("users", {users: result});
    } catch (err){
        console.log("Error getUsers:" ,err);
          res.redirect('/admin/login'); 
    }  
};

//UpdateChosenUsers

dealershipController.updateChosenUser = async (req: Request, res:Response) => {
    try {
     console.log("updateChosenUser");
     const result = await memberService.updateChosenUser(req.body);
     console.log(result);
     res.status(HttpCode.OK).json({data: result});
    } catch (err){
        console.log("Error updateChosenUser:" ,err);
        if (err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
       
    }  
};


// Check Me
dealershipController.checkMe = async (
    req: AdminRequest,
     res:Response
    ) => {
    try {
        console.log("checkMe");
       if (req.session?.member) res.send(`Hi, ${req.session.member.memberNick}`);
       else res.send(`<script>alert('${Message.NOT_AUTHENTICATED}');</script>`);
    } catch (err){
        console.log("Error checkMe:" ,err);
        res.send(err);
    }  
};


dealershipController.verifyAdmin = (
    req: AdminRequest,
    res:Response,
    next: NextFunction
) => {
 
        if(req.session?.member?.memberType===MemberType.ADMIN){
            req.member = req.session.member;
            next();
        }else{
            const message = Message.NOT_AUTHENTICATED;
        res.send(`<script>alert('${message}'); window.location.replace('/admin/login');</script>`
            
        );
       
     } 
}; 



export default dealershipController;



