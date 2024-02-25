import { SetMetadata } from '@nestjs/common';
import { LOG_META } from '../constant';

export const SetLog = (data: string) => {
  return SetMetadata(LOG_META, data);
};
