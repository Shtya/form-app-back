// src/common/interceptors/image-upload.interceptor.ts

/* 

@UseInterceptors(
  FileInterceptor('file', multerOptions),
  ImageUploadInterceptor
)
@Body() body: any, @UploadedFile() file: any


@UseInterceptors(
  FilesInterceptor('files', 10, multerOptions),
  ImageUploadInterceptor
)
  @Body() body: any, @UploadedFiles() files: any[]


*/
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;
    const files = request.files;
    const body = request.body || {};

    // إذا تم رفع صورة واحدة
    if (file) {
      request.body.image = `/uploads/${file.filename}`
    }

    // إذا تم رفع مجموعة صور
    if (files && Array.isArray(files)) {
      request.body.images = files.map((file, i) => ({
        url: `/uploads/${file.filename}`,
      }));
    }

    return next.handle();
  }
}
