import { Request, Response } from "express";

const express = require("express");
const Image = require("../models/Image");
const auth = require("../middleware/auth");
const userController = require('../controllers/user.controller');
const router = express.Router();

router.post("/upload", async (req: Request, res: Response) => {
   res.send('upload');
});

module.exports = router;