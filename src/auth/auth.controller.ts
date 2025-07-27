import { Body, Controller, Post, Get, UseGuards, Req, Param, ValidationPipe, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserBulkDto, CreateUserBulkRequestDto, CreateUserDto } from 'dto/user.dto';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { UserRole } from 'entities/user.entity';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signin(@Body() body: { email: string; password: string }) {
    return this.authService.signin(body.email, body.password);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('create-user')
  async createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('create-users-bulk')
  async createUsersBulk(@Body() dto: any) {
    return this.authService.createUsersBulk(dto.users);
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('verify-user/:id')
  async verifyAndGetUserCredentials(@Param('id') id: string, @Req() req: any) {
    return this.authService.verifyAndGetUserCredentials(
      req.user.id, // The authenticated admin's ID from JWT
      parseInt(id), // The target user ID
    );
  }
}
