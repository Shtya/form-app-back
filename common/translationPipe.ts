import { Injectable, ValidationPipe, ValidationError, BadRequestException, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor(private readonly i18n: I18nService) {
    super({
      transform: true,
      exceptionFactory: async (errors: ValidationError[]) => {

		const translatedErrors = await this.translateValidationErrors(errors);

        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: translatedErrors,
        });
      },
    });
  }


  
  private async translateValidationErrors(errors: ValidationError[]): Promise<{ field: string; messages: string[] }[]> {
    const translatedErrors = [];
    
    for (const error of errors) {
      const constraints = error.constraints || {}; // Validation constraints
      
      // Translate each constraint message
      const translatedMessages = await Promise.all(
        Object.values(constraints).map(async (message) => {

          return await this.i18n.translate(message);
        }),
      );

      translatedErrors.push( translatedMessages[0] );
    }

    return translatedErrors;
  }
}