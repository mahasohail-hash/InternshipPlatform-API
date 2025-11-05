import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator'; // CRITICAL FIX: Import Public decorator

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public() // CRITICAL FIX: Mark the root endpoint as public
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}