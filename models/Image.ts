const mongoose = require('mongoose');

const imageSchema = mongoose.Schema({
   imageName: {
      type: String,
      required: true
   },
   imageId: {
      type: String,
   },
   imageUrl: {
      type: String
   }
})

const ImageSchema = mongoose.model('Image', imageSchema);
module.exports = ImageSchema;
export { }