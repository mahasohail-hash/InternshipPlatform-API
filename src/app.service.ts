import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to the Internship Management Platform Backend API!'; // More descriptive message
  }
}