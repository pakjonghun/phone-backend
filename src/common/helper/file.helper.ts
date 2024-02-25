import { diskStorage } from 'multer';

export const storage = diskStorage({
  destination: './upload',
  filename(req, file, callback) {
    const suffix = `${Date.now()}_${Math.round(Math.random() * 1000)}`;
    callback(null, suffix);
  },
});
