// src/storage/uploads.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { StorageService } from "./storage.service";

// 🔹 Filtro de tipos permitido (imágenes + docs)
const uploadsFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: any, acceptFile: boolean) => void
) => {
  const mime = file.mimetype;
  const originalname = file.originalname.toLowerCase();

  const isImage = mime.startsWith("image/");
  const allowedMimeTypes = [
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  const allowedExts = [
    ".pdf",
    ".zip",
    ".rar",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
  ];

  const isAllowedNonImage =
    allowedMimeTypes.includes(mime) ||
    allowedExts.some((ext) => originalname.endsWith(ext));

  if (!isImage && !isAllowedNonImage) {
    return cb(
      new BadRequestException(
        `Tipo de archivo no permitido: ${mime} (${file.originalname})`
      ),
      false
    );
  }

  cb(null, true);
};

@Controller("uploads")
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: uploadsFileFilter,
    })
  )
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    const result = await this.storageService.uploadFile(file);

    return {
      ok: true,
      attachment: result,
    };
  }

  @Post("multiple")
  @UseInterceptors(
    FilesInterceptor("file", 5, {
      fileFilter: uploadsFileFilter,
    })
  )
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No se han recibido archivos");
    }

    const uploads = await Promise.all(
      files.map((f) => this.storageService.uploadFile(f))
    );

    return {
      ok: true,
      attachments: uploads,
    };
  }
}
