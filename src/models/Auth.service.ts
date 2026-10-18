import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { AUTH_TIMER } from "../libs/config";
import { MemberStatus } from "../libs/enums/Member.enum";
import { Member } from "../libs/types/member";
import MemberModel from "../schema/Member.model";
dotenv.config();

class AuthService {
  public async createToken(member: Member): Promise<string> {
    return jwt.sign({ _id: String(member._id) }, process.env.SECRET_TOKEN as string,
      { algorithm: "HS256", expiresIn: `${AUTH_TIMER}h` });
  }

  public async checkAuth(token: string): Promise<Member> {
    try {
      const payload = jwt.verify(token, process.env.SECRET_TOKEN as string, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload._id !== "string") throw new Error();
      const member = await MemberModel.findOne({ _id: payload._id, memberStatus: MemberStatus.ACTIVE }).lean().exec();
      if (!member) throw new Error();
      return member as unknown as Member;
    } catch {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }
  }
}
export default AuthService;
