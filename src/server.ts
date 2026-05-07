import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URL as string, {})
 .then((data) => {
    console.log("MonggoDB connection succeed");
		 const  PORT = process.env.PORT ?? 3003;
        console.info(`The server is runnung successfully on port: ${PORT}`);
        console.info(`Admin project on : http://localhost:${PORT}/admin`);
		 }).catch((err) => {
		console.log("MonggoDB connection failed");
		console.log(err);
		 });