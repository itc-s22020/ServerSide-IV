import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import authConfig from "./util/auth.js";
import logger from "morgan";

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
// session
app.use(session({
  secret: "B02CGO2YqVlyDXbfQ7a6CX3zNLSHzLkXM0BjRqfhIoSiVxtH",
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 60 * 60 * 1000}
}));
// passport
app.use(passport.authenticate("session"));
authConfig(passport);
// cors
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// 404
app.use((req, res, next) => {
  res.status(404).json({message: "not found."});
});

/**
 * error handler
 * 様々な場所でエラーが発生、または発生させて
 * こちらでまとめて対処するための関数。
 *
 * @type express.ErrorRequestHandler
 */
const errorHandler = (err, req, res, next) => {
  // デフォルトは内部サーバーエラーとしておく。
  let message = "Internal Server Error";
  if (err.status === 401) {
    // ここに来る場合は、未認証によるエラーなのでメッセージを書き換える。
    message = "unauthenticated";
  } else {
    // エラーの詳細はクライアントに返さないので、ここで吐き出しておく。
    console.error(err);
  }
  res.status(err.status || 500).json({message});
};
app.use(errorHandler);

export default app;