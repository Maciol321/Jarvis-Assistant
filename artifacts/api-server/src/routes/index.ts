import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jarvisRouter from "./jarvis";
import transportRouter from "./transport";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/jarvis", jarvisRouter);
router.use("/transport", transportRouter);

export default router;
