import express from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import { calcHash, generateSalt } from "../util/auth.js";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ログイン状態チェック
 */
router.get("/check", (req, res, next) => {
  if (!req.user) {
    const err = new Error("NG"); //"unauthenticated"
    err.status = 401;
    throw err;
  }
  const isAdmin = req.user.isAdmin
  res.status(200).json({
    result: "OK",
    isAdmin: isAdmin
  });
});


/**
 * ユーザ認証
 */
router.post("/login", passport.authenticate("local", {
  failWithError: true // passport によるログインに失敗したらエラーを発生させる
}), (req, res, next) => {
  // ここに来れるなら、ログインは成功していることになる。
  const isAdmin = req.user.isAdmin;
  res.json({
    result: "OK",
    isAdmin: isAdmin
  });
});


/**
 * ユーザ新規作成
 */
router.post("/register", [
    check("name").notEmpty({ignore_whitespace: true}),
    check("password").notEmpty({ignore_whitespace: true}),
    check("email").isEmail()
  ], async (req, res, next) => {
    if (!validationResult(req).isEmpty()) {
      res.status(400).json({
        result: "NG (json error)" //"username, password, and/or email is empty or invalid"
      });
      return;
    }
    const {name, password, email} = req.body;
    const salt = generateSalt();
    const hashed = calcHash(password, salt);
    try {
      await prisma.users.create({
        data: {
          name,
          password: hashed,
          salt,
          email
        }
      });
      res.status(201).json({
        result: "OK (created)"
      });
    } catch (e) {
      switch (e.code) {
        case "P2002":
          res.status(409).json({
            result: "NG (duplicate email address)"
          });
          break;
        default:
          console.error(e);
          res.status(500).json({
            result: "NG (unknown error)"
          });
      }
    }
  });

/**
 * ユーザーのログアウト
 */
router.get("/logout", (req, res) => {
  req.logout((err) => {res.status(200).json({ result: "OK" });});
});



export default router;
