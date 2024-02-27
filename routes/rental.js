import express from "express";
import {check, validationResult} from "express-validator";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * 全経路でログイン済みかチェックする
 */
router.use((req, res, next) => {
    if (!req.user) {
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    // 問題なければ次へ
    next();
});

router.post("/start", async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.user.id;

    try {
        const existingRental = await prisma.rental.findFirst({
            where: {
                bookId: bookId,
                returnDate: null,
            },
        });

        if (existingRental) {
            return res.status(409).send({ result: "NG (currently on loan)" });
        }
        const today = new Date();
        const returnDeadline = new Date(today);
        returnDeadline.setDate(today.getDate() + 7); //modelで初期値に指定できなかったnow()+7dayをここで設定

        const rental = await prisma.rental.create({
            data: {
                bookId: bookId,
                userId: userId,
                rentalDate: today,
                returnDeadline: returnDeadline,
            },
        });

        return res.status(201).json({
            id: rental.id,
            bookId: rental.bookId,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ result: "NG" });
    }
});

router.put("/return", async (req, res) => {
    const { rentalId } = req.body;
    if (!rentalId) {
        return res.status(400).json({result: "NG (not exist)"});
    }
    const userId = req.user.id;
    try {
        const rental = await prisma.rental.findFirst({
            where: {
                id: rentalId,
                userId: userId
            }
        });

        if (!rental) {
            return res.status(400).json({ result: "NG (unauthenticated)"});
        }

        if (rental.returnDate !== null) {
            return res.status(400).json({ result: "NG (Returned)"});
        }

        await prisma.rental.update({
            where: { id: rentalId },
            data: { returnDate: new Date() }
        });

        return res.status(200).json({ result: "OK (Returned)"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ result: "NG"});
    }
});


router.get("/current", async (req, res) => {
    try {
        const userId = req.user.id; // ログインユーザーのID (認証方法によって変更が必要かもしれません)

        const rentals = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: null, // 返却されていない書籍のみを対象
            },
            include: {
                Books: true, // 関連する書籍情報も取得
            },
        });

        // 必要な情報のみを抽出してレスポンスとして返す
        const rentalBooks = rentals.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.Books.title, // 書籍名
            rentalDate: rental.rentalDate, // 貸出日
            returnDeadline: rental.returnDeadline, // 返却期限
        }));

        res.status(200).json({ rentalBooks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: "NG"});
    }
});


router.get("/history", async (req, res) => {
    try {
        const userId = req.user.id; // ログインユーザーのID

        // ログインユーザーに関連付けられた貸出履歴を取得
        const rentalHistory = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: { not: null }, // 返却された貸出情報のみを対象
            },
            include: {
                Books: true, // 関連する書籍情報も取得
            },
        });

        // 必要な情報のみを抽出してレスポンスとして返す
        const formattedHistory = rentalHistory.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.Books.title, // 書籍名
            rentalDate: rental.rentalDate, // 貸出日
            returnDate: rental.returnDate, // 返却日
        }));

        res.status(200).json({ rentalHistory: formattedHistory });
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: "NG"});
    }
});


export default router;
