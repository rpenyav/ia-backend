// src/users/users.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";
import { UserMongo, UserMongoSchema } from "./schema/user.schema"; // ajusta a "schemas" si es tu caso

const isMongo = process.env.DB_DRIVER === "mongodb";

const typeOrmImports = isMongo ? [] : [TypeOrmModule.forFeature([User])];

const mongooseImports = isMongo
  ? [
      MongooseModule.forFeature([
        { name: UserMongo.name, schema: UserMongoSchema },
      ]),
    ]
  : [];

@Module({
  imports: [...typeOrmImports, ...mongooseImports],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
