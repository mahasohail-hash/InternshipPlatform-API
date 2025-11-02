import { Injectable, NotFoundException } from '@nestjs/common'; 
import { User } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class CurrentUserService {
constructor(private readonly usersService: UsersService) {}

 // This method handles the primary fetch for the currently logged-in user.
 async getCurrentUser(userId: string): Promise<User> {
   const user = await this.usersService.findOne(userId);
   if (!user) {
       throw new NotFoundException(`User with ID "${userId}" not found.`);
   }
   return user;
 }

 async getUserProfileById(userId: string): Promise<User> {
   // The call to findOne only accepts the userId (one argument)
   return this.usersService.findOne(userId);  }

 async getUserWithRelations(userId: string): Promise<User> {
   const user = await this.usersService.findOne(userId); 
   if (!user) {
       throw new NotFoundException(`User with ID "${userId}" not found.`);
   }
   return user;
 }
}
