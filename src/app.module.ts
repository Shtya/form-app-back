import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule and ConfigService
import {
  I18nModule,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { LoggingValidationPipe } from 'common/translationPipe';
import { QueryFailedErrorFilter } from 'common/QueryFailedErrorFilter';
import { UserModule } from './user/user.module';
import { FormModule } from './form/form.module';
import { FormSubmissionModule } from './form-submission/form-submission.module';
import { AssetModule } from './asset/asset.module';
import { ProjectsModule } from './project/project.module';


@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
    }),

    // I18nModule with async configuration
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/../i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
      ],
    }),

    AuthModule,
    UserModule,
    FormModule,
    FormSubmissionModule,
    AssetModule,
    ProjectsModule
  ],
  controllers: [AppController],
  providers: [AppService, LoggingValidationPipe , QueryFailedErrorFilter ],
  exports: [LoggingValidationPipe ],
})
export class AppModule {}
