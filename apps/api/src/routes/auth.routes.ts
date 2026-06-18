import { Router } from "express";
import { refresh, signin, signout, signup } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/refresh", refresh);
authRouter.post("/signout", signout);
