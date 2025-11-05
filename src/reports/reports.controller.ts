import { Controller, Get, Param, Res, UseGuards, UnauthorizedException, NotFoundException, InternalServerErrorException, ParseUUIDPipe, ForbiddenException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface JwtPayloadUser { id: string; role: UserRole; }

@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards globally to the controller
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /api/reports/final-packet/:internId - Generate and download a final PDF packet for an intern
  @Get('final-packet/:internId')
  @Roles(UserRole.MENTOR, UserRole.HR) // Only Mentors and HR can generate these reports
  async generateFinalPacket(
    @Param('internId', ParseUUIDPipe) internId: string, // Validate internId is UUID
    @Res() res: Response, // Use Nest's @Res decorator
    @CurrentUser() user: JwtPayloadUser // Get current user for authorization
  ) {
    try {
      // Service handles authorization (mentor must mentor the intern, HR can view all)
      const pdfBuffer = await this.reportsService.generateInternFinalPacketPdf(internId, user.id, user.role);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="intern_final_packet_${internId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error(`Error generating PDF for intern ${internId} by user ${user.id} (${user.role}):`, error);

      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        res.status(error.getStatus()).json({ statusCode: error.getStatus(), message: error.message });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Failed to generate PDF report due to an internal server error.' });
      }
    }
  }
}