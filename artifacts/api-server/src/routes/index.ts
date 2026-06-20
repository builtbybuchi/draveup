import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import webhooksRouter from "./webhooks.js";
import usersRouter from "./users.js";
import domainsRouter from "./domains.js";
import tldsRouter from "./tlds.js";
import currencyRouter from "./currency.js";
import walletRouter from "./wallet.js";
import ordersRouter from "./orders.js";
import adminRouter from "./admin.js";
import contactsRouter from "./contacts.js";
import homeRouter from "./home.js";

import blogRouter from "./blog.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhooksRouter);
router.use(usersRouter);
router.use(domainsRouter);
router.use(tldsRouter);
router.use(currencyRouter);
router.use(walletRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(contactsRouter);
router.use(homeRouter);
router.use(blogRouter);

export default router;
