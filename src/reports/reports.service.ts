import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { EvaluationsService } from '../evaluations/evaluations.service';
import { AnalyticsService } from '../analytics/analytics.service'; // CRITICAL FIX: Import AnalyticsService
import { Evaluation, EvaluationType } from '../evaluations/entities/evaluation.entity';
import { ProjectDetailsDto } from '../projects/dto/project-details.dto';
import { UserRole } from '@/common/enums/user-role.enum';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable()
export class ReportsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
    private readonly evaluationsService: EvaluationsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateInternFinalPacketPdf(internId: string, requesterId: string, requesterRole: UserRole): Promise<Buffer> {
    const intern = await this.usersService.findOne(internId);
    if (!intern || intern.role !== UserRole.INTERN) {
      throw new NotFoundException(`Intern with ID "${internId}" not found or is not an INTERN.`);
    }

  if (requesterRole !== UserRole.HR && requesterRole !== UserRole.MENTOR) {
  throw new UnauthorizedException('You do not have permission to generate this report.');
}


    // 1. Gather all necessary data
    const internProfile = intern;
    const evaluations = await this.evaluationsService.getEvaluationsForIntern(internId, requesterId, requesterRole);
    const internInsights = await this.analyticsService.getInternInsights(internId);

    // CRITICAL FIX: Find the project the intern is primarily assigned to
    const allProjects = await this.projectsService.findAllWithDetails(); // Get all projects with details

const assignedProject = await this.projectsService.findPrimaryProjectForIntern(internId);

if (!assignedProject || assignedProject.mentor?.id !== requesterId) {
  throw new ForbiddenException('You are not authorized to generate reports for this intern.');
}



    // 2. Prepare content for PDF
    const content: any[] = [
      { text: `Internship Final Packet: ${internProfile.firstName} ${internProfile.lastName}`, style: 'header' },
      { text: `Generated: ${new Date().toLocaleDateString()}`, alignment: 'right', margin: [0, 0, 0, 20] },

      { text: '1. Intern Profile', style: 'subheader' },
      {
        columns: [
          { text: 'Name:', bold: true }, { text: `${internProfile.firstName} ${internProfile.lastName}` },
          { text: 'Email:', bold: true }, { text: internProfile.email },
        ],
        columnGap: 10,
        margin: [0, 5, 0, 5],
      },
      { text: `Role: ${internProfile.role}`, margin: [0, 0, 0, 10] },

      { text: '2. Project Details', style: 'subheader' },
      assignedProject ? [
        { text: `Project Title: ${assignedProject.title}`, bold: true },
        { text: `Status: ${assignedProject.status}` },
        { text: `Mentor: ${assignedProject.mentor?.firstName || ''} ${assignedProject.mentor?.lastName || ''} (${assignedProject.mentor?.email || 'N/A'})` },
        assignedProject.description ? { text: `Description: ${assignedProject.description}`, margin: [0, 5, 0, 10] } : null,
        { text: 'Milestones:', bold: true, margin: [0, 5, 0, 0] },
        (assignedProject.milestones || []).length > 0 ? (assignedProject.milestones || []).map((milestone: any) => ([
          { text: `  • ${milestone.title} (Due: ${milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'N/A'})`, margin: [10, 2, 0, 0] },
          (milestone.tasks || []).length > 0 ? {
            ul: milestone.tasks.map((task: any) => `    - ${task.title} (Status: ${task.status}, Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'})`),
            margin: [20, 2, 0, 5]
          } : { text: '    No tasks.', margin: [20, 2, 0, 5] }
        ])) : { text: 'No milestones defined.', margin: [0, 5, 0, 10] },
      ] : { text: 'No primary project assigned.', margin: [0, 5, 0, 10] },


      { text: '3. Performance Metrics (Insights)', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'GitHub Contributions:', bold: true },
              { text: `  Total Commits: ${internInsights.github?.totalCommits || 0}` },
              { text: `  Total Additions: ${internInsights.github?.totalAdditions || 0}` },
              { text: `  Total Deletions: ${internInsights.github?.totalDeletions || 0}`, margin: [0, 0, 0, 5] },
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'NLP Feedback Summary:', bold: true },
              { text: `  Sentiment: ${internInsights.nlp?.sentimentScore || 'N/A'}` },
              { text: `  Key Themes: ${(internInsights.nlp?.keyThemes || []).join(', ') || 'N/A'}` },
            ]
          },
        ],
        margin: [0, 5, 0, 10]
      },
      { text: `Task Completion Rate: ${internInsights.tasks?.completionRate.toFixed(0) || 0}%`, margin: [0, 0, 0, 10] },


      { text: '4. Evaluations & Feedback', style: 'subheader' },
      evaluations.length > 0 ? evaluations.map((evalItem: Evaluation) => ([
        { text: `${evalItem.type} - Score: ${evalItem.score || 'N/A'}/5`, bold: true, margin: [0, 5, 0, 0] },
        { text: `Date: ${evalItem.createdAt.toLocaleDateString()}`, italics: true },
        { text: `Mentor: ${evalItem.mentor?.firstName || ''} ${evalItem.mentor?.lastName || ''} (${evalItem.mentor?.email || 'N/A'})`, margin: [0, 0, 0, 5] },
        { text: 'Feedback:', bold: true },
        { text: evalItem.feedbackText, margin: [0, 0, 0, 10] },
        { text: '---', alignment: 'center', margin: [0, 5, 0, 5] }
      ])) : { text: 'No evaluations recorded for this intern.', margin: [0, 5, 0, 10] },
    ].filter(Boolean);


    // 3. Define PDF document structure
   const docDefinition: TDocumentDefinitions = {
  content,
  styles: {
    header: {
      fontSize: 24,
      bold: true,
      margin: [0, 0, 0, 10],
      color: '#333333',
    },
    subheader: {
      fontSize: 18,
      bold: true,
      margin: [0, 15, 0, 5],
      color: '#555555',
    },
    defaultStyle: {
      fontSize: 10,
    },
  },
  pageMargins: [40, 40, 40, 40] as [number, number, number, number],
};

const fonts = {
  Roboto: {
    normal: `${process.cwd()}/src/common/pdf/fonts/Roboto-Regular.ttf`,
    bold: `${process.cwd()}/src/common/pdf/fonts/Roboto-Bold.ttf`,
    italics: `${process.cwd()}/src/common/pdf/fonts/Roboto-Medium.ttf`,
    bolditalics: `${process.cwd()}/src/common/pdf/fonts/Roboto-Medium.ttf`,
  },
};

const printer = new PdfPrinter(fonts);
const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', (err) => reject(err));

    pdfDoc.end();
  });
} catch (err: any) {
  console.error('PDF generation failed:', err.stack || err.message || err);
  throw new InternalServerErrorException('Failed to generate PDF document.');
}
  }
