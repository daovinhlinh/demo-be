const cloudinary = require('cloudinary').v2;

cloudinary.config({
   cloud_name: process.env.CLOUD_NAME,
   api_key: process.env.CLOUD_API_KEY,
   api_secret: process.env.CLOUD_API_SECRET,
});

const uploads = async (file: File) => {
   const res = await cloudinary.v2.uploader.upload(file, {
      resource_type: "auto",
   });

   return res;
}