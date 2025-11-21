// src/users/users.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { User } from "./entities/user.entity";
import { UserMongo, UserMongoDocument } from "./schema/user.schema"; // ojo a la ruta
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    // SQL (puede ser null si DB_DRIVER = mongodb)
    @InjectRepository(User)
    @Optional()
    private readonly usersRepo: Repository<User> | null,

    // Mongo (puede ser null si DB_DRIVER != mongodb)
    @InjectModel(UserMongo.name)
    @Optional()
    private readonly userModel: Model<UserMongoDocument> | null
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  // --------- Métodos usados por Auth ---------
  async findByEmail(email: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      return this.userModel.findOne({ email }).exec();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }
      return this.usersRepo.findOne({ where: { email } });
    }
  }

  async createUser(params: {
    email: string;
    password: string;
    name?: string;
  }): Promise<any> {
    const passwordHash = await bcrypt.hash(params.password, 10);

    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      const doc = new this.userModel({
        email: params.email,
        passwordHash,
        name: params.name,
      });
      return doc.save();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }
      const user = this.usersRepo.create({
        email: params.email,
        passwordHash,
        name: params.name,
      });
      return this.usersRepo.save(user);
    }
  }

  // --------- CRUD /users ---------
  async create(dto: CreateUserDto): Promise<any> {
    return this.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
  }

  async findAll(): Promise<any[]> {
    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      return this.userModel.find().exec();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }
      return this.usersRepo.find();
    }
  }

  async findOne(id: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      return this.userModel.findById(id).exec();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }
      return this.usersRepo.findOne({ where: { id } });
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<any> {
    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      const update: any = {};
      if (dto.name !== undefined) update.name = dto.name;
      if (dto.password) {
        update.passwordHash = await bcrypt.hash(dto.password, 10);
      }
      return this.userModel
        .findByIdAndUpdate(id, { $set: update }, { new: true })
        .exec();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }

      const user = await this.usersRepo.findOne({ where: { id } });
      if (!user) return null;

      if (dto.name !== undefined) user.name = dto.name;
      if (dto.password) {
        user.passwordHash = await bcrypt.hash(dto.password, 10);
      }

      return this.usersRepo.save(user);
    }
  }

  async remove(id: string): Promise<void> {
    if (this.useMongo) {
      if (!this.userModel) {
        throw new Error("UserMongoModel no disponible (DB_DRIVER no mongodb)");
      }
      await this.userModel.findByIdAndDelete(id).exec();
    } else {
      if (!this.usersRepo) {
        throw new Error("UserRepository no está disponible (DB_DRIVER no SQL)");
      }
      await this.usersRepo.delete({ id });
    }
  }
}
