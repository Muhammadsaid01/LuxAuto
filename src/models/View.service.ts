import Errors, { HttpCode, Message } from '../libs/Errors';
import { View, ViewInput } from '../libs/types/view';
import viewSchema from '../schema/View.model';

class ViewService {
	private readonly viewModel;

	constructor() {
		this.viewModel = viewSchema;
	}

	public async checkViewExistence(input:ViewInput) : Promise<View>  {
		// @ts-ignore
		return await this.viewModel
		.findOne({memberId: input.memberId, viewRefId:input.viewRefId })
		.exec();
		
	}

	public async insertMemberView(input:ViewInput):Promise<View>  {
		try{
			// @ts-ignore
			return await this.viewModel.create(input);
		}catch(err) {
			console.log("ERROR ,model:insertMemberView: ", err);
			throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
		}
	}

}

export default  ViewService;