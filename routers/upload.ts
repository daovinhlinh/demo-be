import { NextFunction, Request, Response } from "express";
import { uploads } from "../config/multer";

const express = require("express");
const csv = require("csvtojson");

const router = express.Router();

router.post(
  "/",
  uploads.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    console.log(file?.path);
    if (!file) {
      const error = new Error("Please upload a file");
      // error.status = 400
      // return res.status(400).send(error.message);
      return next(error);
    }

    csv()
      .fromFile(file.path)
      .then((result: Record<string, any>[]) => {
        // return res
        return res.status(200).send({
          message: "Upload successfully!",
          data: result,
        });
      });
  }
);

module.exports = router;
