import dotenv from 'dotenv';
import mongoose from "mongoose";
import app from "./app";
dotenv.config();
mongoose.set("strictQuery", true);
 mongoose.connect(process.env.MONGO_URL as string, {})
 .then((data) => {
    console.log("MonggoDB connection succeed");
    const  PORT = process.env.PORT ?? 3003
    app.listen(PORT, function() {
        console.info(`The server is runnung successfully on port: ${PORT}`);
        console.info(`Admin project on : http://localhost:${PORT}/admin`);
    });
 })
 .catch((err) => console.log("Error with connecttion of MongoDB", err));