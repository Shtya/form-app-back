// form-submission.controller.ts

import { Controller, Post, Body, Get, Delete, Param, UseGuards, Req, ForbiddenException, Query, Patch } from '@nestjs/common';
import { FormSubmissionService } from './form-submission.service';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('form-submissions')
@UseGuards(AuthGuard)
export class FormSubmissionController {
	constructor(private readonly submissionService: FormSubmissionService) { }

	@Post()
	create(@Req() req: any, @Body() dto: CreateFormSubmissionDto) {
		const userId = req.user.id;
		return this.submissionService.create(userId, dto);
	}

	@Get()
	getAll(
		@Req() req: any,
		@Query('page') page = '1',
		@Query('limit') limit = '10',
		@Query('form_id') form_id?: string,
		@Query('project_id') project_id?: string,
		@Query('type') type?: string,
		@Query('search') search?: string
	) {
		const user = req.user;
		if (user.role === 'admin') {
			return this.submissionService.findAllForAdmin(+page, +limit, form_id, project_id, type, search);
		} else if (user.role === 'rpg_admin') {
			// RPG Admin sees all submissions for their project (scoped by project_id from their profile)
			return this.submissionService.findAllForRpgAdmin(+page, +limit, user.id, form_id, type, search);
		} else if (user.role === 'supervisor') {
			return this.submissionService.findAllForSupervisor(+page, +limit, user.id, form_id, project_id, type);
		} else {
			return this.submissionService.findAllByUser(user.id, type, search);
		}
	}


	@Get(':id')
	async getOne(@Req() req: any, @Param('id') id: string) {
		const user = req.user;
		const submission = await this.submissionService.findOne(+id);

		if (!submission) {
			throw new ForbiddenException('Submission not found');
		}

		// Basic access control
		if (user.role !== 'admin' && user.role !== 'rpg_admin' && user.role !== 'supervisor' && submission.user.id !== user.id) {
			throw new ForbiddenException('You do not have permission to view this submission');
		}

		return submission;
	}

	@Patch(':id')
	async update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
		const user = req.user;
		const submission = await this.submissionService.findOne(+id);

		if (!submission) {
			throw new ForbiddenException('Submission not found');
		}

		if (user.role !== 'admin' && user.role !== 'rpg_admin' && submission.user.id !== user.id) {
			throw new ForbiddenException('You do not have permission to update this submission');
		}

		return this.submissionService.update(+id, dto);
	}

	@Delete(':id')
	async delete(@Req() req: any, @Param('id') id: string) {
		const user = req.user;
		const submission = await this.submissionService.findOne(+id);

    if (!submission) {
      throw new ForbiddenException('Submission not found');
    }

    if (user.role !== 'admin' && user.role !== 'rpg_admin' && submission.user.id !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this submission');
    }

    return this.submissionService.deleteSubmission(+id);
  }

	@Post('bulk-upload')
	async bulkUpload(@Req() req: any, @Body() body: { submissions: Array<{ userId: number; answers: Record<string, any>; form_id: string }> }) {
		const user = req.user;
		if (user.role !== 'admin' && user.role !== 'supervisor' && user.role !== 'rpg_admin') {
			throw new ForbiddenException('Only admins and supervisors can bulk upload submissions');
		}
		return this.submissionService.bulkCreateSubmissions(body.submissions);
	}

    @Patch(':id/approve')
    async approve(@Req() req: any, @Param('id') id: string) {
        return this.submissionService.approveSubmission(+id, req.user.role);
    }

	@Patch(':id/reject')
    async reject(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
        return this.submissionService.rejectSubmission(+id, reason);
	}

	@Post(':id/resend-crm')
	async resendToCrm(@Req() req: any, @Param('id') id: string) {
		if (req.user?.role !== 'admin') {
			throw new ForbiddenException('Only administrators can resend a submission to CRM');
		}
		return this.submissionService.resendToCrm(+id);
	}
}
