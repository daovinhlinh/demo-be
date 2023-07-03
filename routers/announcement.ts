import { Request, Response } from "express";
import { ClientSession } from "mongoose";
import { uploads } from "../config/multer";
import { IAuth } from "../middleware/auth";

const express = require("express");

const router = express.Router();
const auth = require("../middleware/auth");
const announcementController = require("../controllers/announcement.controller");

router.get("/list/:classId", auth, announcementController.getAnnouncementList);
router.get("/search", auth, announcementController.searchAnnouncement);
router.post("/add", auth, announcementController.addAnnouncement);
router.post("/update/:id", auth, announcementController.updateAnnouncement);
//delete
router.post("/delete/:id", auth, announcementController.deleteAnnouncement);

module.exports = router;
