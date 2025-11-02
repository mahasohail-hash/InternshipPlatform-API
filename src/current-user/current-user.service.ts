// src/current-user/current-user.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class CurrentUserService {
  constructor(private readonly usersService: UsersService) {}

  // userId type changed to string (UUID)
  async getCurrentUser(userId: string): Promise<User | null> {
    return this.usersService.findOne(userId); // Now uses the updated findOne in UsersService
  }

  // userId type changed to string (UUID)
  async getCurrentUserWithRelations(userId: string, relations: string[] = []): Promise<User | null> {
    // UsersService.findOne now accepts relations
    return this.usersService.findOne(userId);
  }
}