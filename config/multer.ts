const multer = require('multer')
const fs = require('fs');
const path = require('path')

const storage = multer.diskStorage({
  destination: (req: Request, file: any, cb: any) => {
    const folderPath = path.join(__dirname, '../public/uploads/csv');

    fs.access(folderPath, (err: any) => {
      if (err) {
        fs.mkdirSync(folderPath, { recursive: true });
        cb(null, folderPath)
      } else {
        cb(null, folderPath)
      }
    })
  },
  filename: (req: Request, file: any, cb: any) => {
    cb(null, Date.now() + '_' + file.originalname)
  },
})

export const uploads = multer({ storage: storage })
