import express from "express";
import {check, validationResult} from "express-validator";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const maxItemCount = 10;

/* GET home page. */
router.get("/", function (req, res, next) {
    res.json({result: "hello"});
});

export default router;