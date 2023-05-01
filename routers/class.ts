import { Request, Response } from "express";

const express = require("express");
const Class = require("../models/Class");
const auth = require("../middleware/auth");
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/list', async (req: Request, res: Response) => {
  try {
    const classes = await Class.find();
    res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: 'Cannot get list class',
    })
  }
});

router.post('/add', async (req: Request, res: Response) => {
  try {
    console.log(req)
    // const classes = await Class.find();
    // res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: 'Cannot get list class',
    })
  }
});

module.exports = router;