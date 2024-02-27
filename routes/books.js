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
    next();
});

router.get("/list", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const totalBooks = await prisma.books.count();
        const maxPage = Math.ceil(totalBooks / limit);

        // 書籍データ
        const books = await prisma.books.findMany({
            skip: skip,
            take: limit,
            select: {
                id: true,
                title: true,
                author: true,
            }
        });

        // 貸出中確認
        const booksWithRentalStatus = await Promise.all(books.map(async (book) => {
            const rental = await prisma.rental.findFirst({
                where: {
                    bookId: book.id,
                    returnDate: null,
                },
            });
            return {
                ...book,
                isRental: rental !== null,
            };
        }));

        res.json({
            books: booksWithRentalStatus,
            maxPage: maxPage
        });
    } catch (error) {
        next(error);
    }
});


router.get('/detail/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const book = await prisma.books.findUnique({
            where: {
                id: BigInt(id), // PrismaではBigInt型を明示的に指定する必要があります
            },
            include: {
                rentals: {
                    where: {
                        returnDate: null, // 未返却の貸出情報のみ取得
                    },
                    select: {
                        User: {
                            select: {
                                name: true,
                            },
                        },
                        rentalDate: true,
                        returnDeadline: true,
                    },
                },
            },
        });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const response = {
            id: book.id,
            isbn13: book.isbn13,
            title: book.title,
            author: book.author,
            publishDate: book.publishDate,
            rentalInfo: book.rentals.length > 0 ? {
                userName: book.rentals[0].User.name,
                rentalDate: book.rentals[0].rentalDate,
                returnDeadline: book.rentals[0].returnDeadline,
            } : undefined,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        next(error);
    }
});



export default router;
