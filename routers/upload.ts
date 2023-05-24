import { NextFunction, Request, Response } from "express";
import { uploads } from "../config/multer";

const express = require("express");
const Image = require("../models/Image");
const Wifi = require("../models/Wifi");
const auth = require("../middleware/auth");
const userController = require('../controllers/user.controller');
const csv = require('csvtojson')

const router = express.Router();

router.post("/", uploads.single('file'), async (req: Request, res: Response, next: NextFunction) => {
   const file = req.file;
   console.log(file?.path);
   if (!file) {
      const error = new Error('Please upload a file')
      // error.status = 400
      // return res.status(400).send(error.message);
      return next(error)
   }

   csv().fromFile(file.path).then((result: Record<string, any>[]) => {
      // return res
      return res.status(200).send({
         message: 'Upload successfully!',
         data: result
      });
   })
});

router.post('/wifi', async (req: Request, res: Response) => {
   console.log(req.body);

   const wifiData = new Wifi(req.body);
   wifiData.save()
      .then((result: any) => {
         res.status(201).send(result);
      }
      ).catch((error: any) => {
         res.status(401).send(error);
      })
})

module.exports = router;