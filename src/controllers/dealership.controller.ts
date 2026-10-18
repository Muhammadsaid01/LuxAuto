import { NextFunction, Request, Response } from 'express';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { MemberStatus, MemberType } from '../libs/enums/Member.enum';
import { T } from '../libs/types/common';
import { AdminRequest, LoginInput, MemberInput } from '../libs/types/member';
import MemberService from '../models/Member.service';
const memberService = new MemberService();
// HomePage
const dealershipController: T = {};

dealershipController.getHomePage = (req: Request , res: Response) => {
	 try {
		res.render("home");
	 }catch (err) {
		res.redirect("/admin");
	 }
};

//Signup
dealershipController.getSignup = (req: Request , res: Response) => {
	 try {
		res.render("signup");
	 }catch (err) {
		res.redirect("/admin");
	 }
};

//Login 
dealershipController.getLogin = (req: Request, res:Response) => {
    try {
     res.render("login");
    } catch (err){
          res.redirect('/admin'); 
    }  
};


dealershipController.processSignup =  async(req: AdminRequest, res: Response) => {
  try {
    const file = req.file;
   if (!file) throw new Errors (HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);
 ;

    const newMember: MemberInput = req.body;
    newMember.memberImage = file?.path.replace(/\\/g,"/");
    newMember.memberType = MemberType.ADMIN;
    const memberService = new MemberService();
     const result =   await memberService.processSignup(newMember, file.path.replace(/\\/g, "/"));

 req.session.member = result ;
 req.session.save(function() {
  res.redirect("/admin/product/all");
 });
  } catch (err) {
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(`<script>alert("${message}"); window.location.replace('/admin/signup');</script>`);
  }
};

// Process Login
dealershipController.processLogin = async (req: AdminRequest, res:Response) => {
    try {
        const input: LoginInput = req.body;
        const result = await memberService.processLogin(input);



       req.session.member = result;
       req.session.save(function(){
            res.redirect("/admin/product/all"); 
       });
        
    } catch (err){
        const message =
         err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
         res.send(`<script>alert('${message}'); window.location.replace('/admin/login');</script>`);
    }  
};
dealershipController.logout = async (req: AdminRequest, res:Response) => {
    try {
       req.session.destroy(function(){
        res.redirect('/admin');   

       });
    } catch (err){
        res.redirect('/admin'); 
    }  
};

//Users
dealershipController.getUsers= async (req: Request, res:Response) => {
    try {
        const result = await memberService.getUsers();
        res.render("users", {users: result});
    } catch (err){
          res.redirect('/admin/login'); 
    }  
};

//UpdateChosenUsers

dealershipController.updateChosenUser = async (req: Request, res:Response) => {
    try {
     const result = await memberService.updateChosenUser(req.body);
     res.status(HttpCode.OK).json({data: result});
    } catch (err){
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
       if (req.session?.member) res.send(`Hi, ${req.session.member.memberNick}`);
       else res.send(`<script>alert('${Message.NOT_AUTHENTICATED}');</script>`);
    } catch (err){
        res.send(err);
    }  
};


dealershipController.verifyAdmin = async (
    req: AdminRequest,
    res:Response,
    next: NextFunction
) => {
 
        if(req.session?.member?.memberType===MemberType.ADMIN){
            try {
              const current = await memberService.getMemberDetail(req.session.member);
              if (current.memberType !== MemberType.ADMIN || current.memberStatus !== MemberStatus.ACTIVE) throw new Error();
              req.member = current;
              next();
            } catch {
              res.redirect("/admin/login");
            }
        }else{
            const message = Message.NOT_AUTHENTICATED;
        res.send(`<script>alert('${message}'); window.location.replace('/admin/login');</script>`
            
        );
       
     } 
}; 



export default dealershipController;



