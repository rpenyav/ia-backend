import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { StorageService } from "./storage.service";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    const result = await this.storageService.uploadFile(file);

    return {
      ok: true,
      attachment: result,
    };
  }
}
