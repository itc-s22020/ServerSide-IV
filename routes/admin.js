import express from "express";
import passport from "passport";
import {PrismaClient} from "@prisma/client";

const {handle} = "express/lib/router/index.js";
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


router.use((req, res, next) => {
    console.log(req.user.isAdmin)
    if (!req.user.isAdmin) {
        const err = new Error("you not admin");
        err.status = 403;
        throw err;
    }
    next();
});

// const checkAdminMiddleware = async (req, res, next) => {
//     if (!req.user.isAdmin) {
//         const err = new Error("NG");
//         err.status = 403;
//         throw err;
//     }
//     next();
// };

router.post("/book/create", async (req, res) => {
    const {isbn13, title, author, publishDate} = req.body;

    if (!isbn13 || !title || !author || !publishDate) {
        return res.status(400).json({result: "NG"});
    }

    try {
        const book = await prisma.books.create({
            data: {
                isbn13,
                title,
                author,
                publishDate: new Date(publishDate),
            },
        });
        res.status(201).json({result: "OK"});

    } catch (error) {
        console.error(error);
        res.status(500).json({result: "NG"});
    }
});

router.put("/book/update", async (req, res) => {
    const { bookId, isbn13, title, author, publishDate } = req.body;

    try {
        await prisma.books.update({
            where: { id: bookId },
            data: {
                isbn13,
                title,
                author,
                publishDate: new Date(publishDate)
            }
        });

        res.status(200).json({ result: "OK" });
    } catch (error) {
        res.status(400).json({ result: "NG" });
    }
});

router.get("/rental/current", async (req, res) => {
    try {
        const currentRentals = await prisma.rental.findMany({
            where: {
                returnDate: null // 未返却の貸出のみを取得
            },
            include: {
                Books: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                User: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const rentalBooks = currentRentals.map(rental => ({
            rentalId: rental.id,
            userId: rental.userId,
            userName: rental.User.name,
            bookId: rental.bookId,
            bookName: rental.Books.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({ rentalBooks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: "NG" });
    }
});

router.get("/rental/current/:uid", async (req, res) => {
    try {
        const userId = parseInt(req.params.uid);

        // 指定されたユーザーIDの未返却の貸出情報を取得
        const currentRentals = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: null // 未返却の貸出のみを取得
            },
            include: {
                Books: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                User: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (currentRentals.length === 0) {
            return res.status(404).json({ result: "NG (not found)" });
        }

        const rentalBooks = currentRentals.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.Books.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        const userData = {
            userId: currentRentals[0].userId,
            userName: currentRentals[0].User.name,
            rentalBooks: rentalBooks
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: "NG" });
    }
});



export default router;