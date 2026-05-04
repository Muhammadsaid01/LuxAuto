import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from 'dotenv';
import express from "express";
import morgan from "morgan";
import path from 'path';
import { MORGON_FORMAT } from "./libs/config";
import router from "./router";
import routerAdmin from "./router-admin";
dotenv.config();

import ConnectMongoDB from 'connect-mongodb-session';
import session from 'express-session';
import { T } from './libs/types/common';
const MongoDBStore = ConnectMongoDB(session);

const store= new MongoDBStore({
	uri: process.env.MONGO_URL as string,
	collection: "sessions",
});
/* 1 ENTRANCE */
const app = express();      
app.use(express.static(path.join(__dirname, 'public')));
 // Static Files
 app.use("/uploads", express.static("./uploads"));
app.use(express.urlencoded({extended : true}));
app.use(express.json());
app.use(
	cors({
		credentials:true,
		 origin: true,
		}));
app.use(cookieParser());
app.use(morgan(MORGON_FORMAT));
/* 2 SESSIONS */
app.use(
	session({
		secret: String(process.env.SESSION_SECRET),
		cookie: { 
			maxAge: 1000 * 60 * 60 * 3 // 3 hours
		}, 
		store: store,
		resave: true,
		saveUninitialized: true,
	})
);

app.use(function(req, res, next){
	const sessionInstance = req.session as 	T;
		res.locals.member = sessionInstance.member;
		next();
});


/* 3 VIEWS */
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "ejs");
   
/* 4 ROUTING */
//BSSR : EJS
app.use("/admin", routerAdmin); // ejs
app.use("/", router); //Middleware Design Pattern //SPA : REACT

export default app;