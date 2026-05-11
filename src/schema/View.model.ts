import mongoose, { Schema } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const viewSchema = new Schema({
		viewGroup: {
		type: String,
		enum: ViewGroup,
		default: ViewGroup.PRODUCT,
		required: true,
	},
	 viewRefId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Product',
	 },
	 memberId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Member',
	 }

	// Define your schema fields here
}, {timestamps: true} // createdAt, updatedAt
);

export default mongoose.model( "View", viewSchema );