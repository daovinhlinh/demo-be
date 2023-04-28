import { Request, Response } from "express";

const ImageModel = require('../models/Image');

const cloud = require('../config/cloudinary');

const createImage = async (req: Request, res: Response) => {
   let imageDetails = {
      imageName: req.files[0].originalname,
   };

   //Query to MONGO to check if image already exists
   ImageModel.find({
      imageName: imageDetails.imageName
   }, (err: Error, cb: Function) => {
      if (err) {
         res.json({
            err: err,
            message: 'Image already exists'
         })
      } else {
         let attempt = {
            imageName: req.files[0].imageName,
            imageUrl: req.files[0].path,
            imageId: ''
         }

         cloud.uploads(attempt.imageUrl).then((result) => {
            const image = new ImageModel({
               imageName: imageDetails.imageName,
               imageCloudId: result.id,
               imageCloudUrl: result.url,
               clientId: req.body.clientId,
               clientName: req.body.clientName,
            });

            image.save((err: Error, cb) => {
               if (err) {
                  res.json({
                     success: false,
                     message: 'Upload failed'
                  })
               } else {
                  res.json({
                     success: true,
                     message: 'Upload successful',
                  })
               }
            });
         });
      }
   })
}