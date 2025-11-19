import { Controller, Get, Param, Res, UseGuards, UnauthorizedException, NotFoundException, InternalServerErrorException, ParseUUIDPipe, ForbiddenException, HttpStatus, Req } from '@nestjs/common';
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
@Roles(UserRole.MENTOR, UserRole.HR)
async generateFinalPacket(
  @Param('internId', ParseUUIDPipe) internId: string,
  @CurrentUser() user: { id: string; role: UserRole },
  @Res() res: Response,
) {
  try {
    const pdfBuffer = await this.reportsService.generateInternFinalPacketPdf(
      internId,
      user.id,
      user.role,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="intern_final_packet_${internId}.pdf"`,
    );

    return res.end(pdfBuffer); // IMPORTANT: do NOT use res.send()
  } catch (error) {
  const err = error as Error;

  return res.status(500).json({
    message: 'Failed to generate PDF.',
    error: err.message,
  });
}

}
}
