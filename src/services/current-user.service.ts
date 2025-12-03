import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';

export type users = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class CurrentUserService {
  constructor(private readonly usersService: UsersService) {}

  async getCurrentUser(id: string): Promise<User> {
    const user = await this.usersService.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }

  async getUserProfileById(id: string): Promise<User> {
    const user = await this.usersService.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }

  async getUserWithRelations(id: string): Promise<User> {
    const user = await this.usersService.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }
}
