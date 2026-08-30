import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp|pdf)$/i;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const uploadsDir = path.resolve(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * UploadsController
 *
 * Handles evidence photo and document uploads for field inspections, issue reports,
 * and maintenance tasks. Uploaded files are persisted in back-end/uploads and served
 * statically from /uploads/<filename>.
 */
@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(RolesGuard)
export class UploadsController {
  @Post('photo')
  @Roles('ENGINEER', 'OFFICER', 'ADMINISTRATOR', 'QC_REVIEWER', 'CITIZEN')
  @ApiOperation({ summary: 'Upload an inspection/evidence photo or document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, uploadsDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
          return cb(
            new BadRequestException(
              'Only jpg, jpeg, png, webp, or pdf files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded under the "photo" field');
    }
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      sizeBytes: file.size,
      mimetype: file.mimetype,
    };
  }
}
