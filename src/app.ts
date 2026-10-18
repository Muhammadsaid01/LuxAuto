import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from 'dotenv';
import express from "express";
import morgan from "morgan";
import path from 'path';
import { authCookieOptions } from "./libs/utils/auth-cookie";
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
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(express.static(path.join(__dirname, 'public')));
 // Static Files
 app.use("/uploads", express.static("./uploads"));
app.use(express.urlencoded({extended : true}));
app.use(express.json());
app.use(
	cors({
		origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
		credentials:true,
        exposedHeaders: ["X-Total-Count"],
		
		}));
// CORS does not stop cross-site form submissions carrying cookies.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const allowed = [process.env.FRONTEND_ORIGIN || "http://localhost:3000", `${req.protocol}://${req.get("host")}`];
  if ((origin && !allowed.includes(origin)) || (!origin && req.get("sec-fetch-site") === "cross-site")) {
    return res.status(403).json({ message: "Request origin is not allowed" });
  }
  next();
});
app.use(cookieParser());
app.use(morgan(MORGON_FORMAT));
/* 2 SESSIONS */
app.use(
	session({
		secret: String(process.env.SESSION_SECRET),
		cookie: {
            ...authCookieOptions(),
			maxAge: 1000 * 60 * 60 * 3 // 3 hours
		}, 
		store: store,
		resave: false,
		saveUninitialized: false,
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