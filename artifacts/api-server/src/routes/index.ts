import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jarvisRouter from "./jarvis";
import transportRouter from "./transport";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/jarvis", jarvisRouter);
router.use("/transport", transportRouter);
router.use("/news", newsRouter);

export default router;
