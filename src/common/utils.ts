import * as path from 'path';
import * as fs from 'fs/promises';
import { cwd } from 'process';
import * as dayjs from 'dayjs';

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

export function getNowDate() {
  return dayjs().format('YYYYMMDDHHmmssSSS');
}
