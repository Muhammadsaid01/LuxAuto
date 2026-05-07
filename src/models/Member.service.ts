import bcrypt from 'bcryptjs';
import { shapeIntoMongooseObjectId } from 'libs/config';
import { MemberStatus, MemberType } from 'libs/enums/Member.enum';
import Errors, { HttpCode, Message } from 'libs/Errors';
import { LoginInput, Member, MemberInput, MemberUpdateInput } from 'libs/types/member';
import MemberModel from 'schema/Member.model';



class MemberService {
	private readonly memberModel;

	constructor() {
		this.memberModel = MemberModel; // Initialize your member model here
	}

/** BSSR */
 public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({ memberType: 	MemberType.ADMIN, memberNick: input.memberNick })
      .exec();
    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);

    //* Password hashing
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = ""; //@ts-ignore

      return result;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
    }
  }

	 public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick, memberType: MemberType.ADMIN },
        { memberNick: 1, memberPassword: 1 },
      )
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
// @ts-ignore
    return await this.memberModel.findById(member._id).exec();
  }


  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel.find({ memberType: MemberType.USER }).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
// @ts-ignore
    return result;
  }
	  public async updateChosenUser(input: MemberUpdateInput): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(input._id);
    const result = await this.memberModel.findByIdAndUpdate({_id: memberId}, input, {new: true, runValidators: true}).exec();

    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
// @ts-ignore
    return result;
  }




/** SPA  */

public async  getAdmin(): Promise<Member> {
  const result =  await this.memberModel.findOne({memberType: MemberType.ADMIN}).lean().exec();
  if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
  // @ts-ignore
    return result;
}

  public async signup(input: MemberInput): Promise<Member> {
    //* Password hashing
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = "";
//@ts-ignore
      return result.toJSON();
    } catch (err) {
      console.error("Error, model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick, memberStatus: {$ne: MemberStatus.DELETE} },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 },
      )
      .exec();
    if (!member) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
    } else if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );

    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
//  @ts-ignore
    return await this.memberModel.findById(member._id).lean().exec();
  }

  public async getMemberDetail(member: Member): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const result = await this.memberModel
    .findOne({
      _id: memberId,
      memberStatus: MemberStatus.ACTIVE
    })
    .exec();

    if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
// @ts-ignore
    return result;
  }

  public async updateMember(
    member:Member,
    input:MemberUpdateInput
  ): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const result = await this.memberModel.findOneAndUpdate({_id: memberId}, input, {new:true}).exec();
    if(!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
// @ts-ignore
    return result;
  }


  public async getTopUsers(): Promise<Member[]> {
    const result =  await this.memberModel.find({memberStatus: MemberStatus.ACTIVE, 
      memberPoints: {$gte: 1},})
    .sort({memberPoints: -1})
    .limit(4)
    .exec();
     if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
//  @ts-ignore
    return result;
  }


  public async addUserPoint(member:Member,point: number):Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
// @ts-ignore
    return await  this.memberModel.findOneAndUpdate(
      {
        _id:memberId,
      memberType: MemberType.USER,
      memberStatus: MemberStatus.ACTIVE,
    },
     {$inc: {memberPoints: point}}, 
     {new: true}).exec();;
  }

};


export default MemberService;