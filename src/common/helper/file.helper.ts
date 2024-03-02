import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { cwd } from 'process';

export const storage = diskStorage({
  destination: './upload',
  filename(req, file, callback) {
    const suffix = `${Date.now()}_${Math.round(Math.random() * 1000)}`;
    callback(null, suffix);
  },
});

export async function deleteUploadFile() {
  try {
    const dirPath = path.join(cwd(), 'upload');

    const files = await fs.readdir(dirPath);
    if (files.length > 0) {
      for await (const file of files) {
        const filePath = path.join(dirPath, file);
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    throw new Error(err);
  }
}
