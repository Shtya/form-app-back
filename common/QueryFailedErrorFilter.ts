import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Inject } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';

@Catch(QueryFailedError)
export class QueryFailedErrorFilter implements ExceptionFilter {
  

  // @Inject(I18nService)  
  //   public readonly i18n: I18nService;
  constructor(private readonly i18n: I18nService) {}
  

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();


    if (exception.driverError?.code   === '23503') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message:  this.i18n.t("events.cannot_delete_or_update") ,
        error:  exception.driverError?.error || 'Foreign Key Constraint Violation',
        details: exception.driverError?.detail,
      });
    } else if (exception.driverError?.code === '23505') {
      // Unique constraint violation (e.g. slug already exists)
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: this.i18n.t('events.duplicate_value'), // You can define this in your translation files
        error: 'Unique Constraint Violation',
        details: exception.driverError?.detail,
      });
    }
    else if (exception.code === '42P01') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.i18n.t("events.missing_table_in_from_clause") ,
        error: 'Missing FROM Clause Entry Error',
        details: exception.driverError?.detail,
      });
    }
    
    else {
      // Handle other database errors
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:  this.i18n.t("events.unexpected_database_error") ,
        error: 'Database Error',
        details: exception?.message,
      });
    }
  }
}