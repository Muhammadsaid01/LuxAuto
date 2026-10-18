import { unlink } from "fs/promises";
import { authCookieOptions } from "../libs/utils/auth-cookie";
import { NextFunction, Request, Response } from "express";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { ExtendedRequest, LoginInput, MemberInput, MemberUpdateInput } from "../libs/types/member";
import AuthService from "../models/Auth.service";
import MemberService from "../models/Member.service";

// for REACT
const memberController: T = {};
const memberService = new MemberService();
const authService = new AuthService();

memberController.getAdmin = async (req: Request, res: Response) => {
   try {
    const result = await memberService.getAdmin();
    
    res.status(HttpCode.OK).json(result);
   
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.signup = async (req: Request, res: Response) => {
  try {
    const input: MemberInput = req.body,
      result = await memberService.signup(input),
    //* TOKENS AUTHENTICATION
    token = await authService.createToken(result);

    res.cookie("accessToken", token, {...authCookieOptions(), maxAge: AUTH_TIMER * 3600 * 1000});

    res.status(HttpCode.CREATED).json({ member: result });
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.login = async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body,
      result = await memberService.login(input),
      //* TOKENS AUTHENTICATION
      token = await authService.createToken(result);

    res.cookie(
      "accessToken", 
      token, {
      ...authCookieOptions(),
      maxAge: AUTH_TIMER * 3600 * 1000
    });

    res.status(HttpCode.OK).json({ member: result });
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};


memberController.logout = async (req: ExtendedRequest, res: Response) => {
  try {

    res.clearCookie("accessToken", authCookieOptions());

    res.status(HttpCode.OK).json({logout: true});
  } catch(err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
}

memberController.getMemberDetail = async (req: ExtendedRequest, res: Response) => {
  try {
    
    const result = await memberService.getMemberDetail(req.member);

    res.status(HttpCode.OK).json(result);
  } catch(err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
}

memberController.updateMember = async (req: ExtendedRequest, res: Response)=> {
     try {
    const input: MemberUpdateInput = req.body;
    const uploadedImage = req.file?.path.replace(/\\/g, "/");
    const result = await memberService.updateMember(req.member, input, uploadedImage);
    res.status(HttpCode.OK).json(result);
  } catch(err) {
    // Only remove the newly uploaded file; the saved profile image remains intact.
    if (req.file?.path) await unlink(req.file.path).catch(() => undefined);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.getTopUsers = async (req: Request, res: Response) => {
  try {
    
    const result = await  memberService.getTopUsers();
    res.status(HttpCode.OK).json(result);
  } catch(err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }

}

memberController.verifyAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["accessToken"];
    if(token) req.member = await authService.checkAuth(token);

    if(!req.member) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    next();
  } catch(err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.retrieveAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["accessToken"];
    if(token) req.member = await authService.checkAuth(token);

    next();
  } catch(err) {
    next();
  }
};

export default memberController;