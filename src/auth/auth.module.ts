import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { User } from 'entities/user.entity';
import { MailService } from 'common/nodemailer';
import { Project } from 'entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User , Project]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRE }
    }),
    ConfigModule,
  ],
  providers: [AuthService , JwtService , MailService],
  controllers: [AuthController ],
})
export class AuthModule {}
