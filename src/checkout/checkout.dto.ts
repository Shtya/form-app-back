// --- File: checkout\checkout.dto.ts ---
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @Matches(/^\+\d{1,5}$/)
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,14}$/)
  phone: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsBoolean()
  agreed: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @IsOptional()
  @IsIn(['pending', 'verified', 'rejected'])
  status?: 'pending' | 'verified' | 'rejected';

  @IsOptional()
  @IsString()
  ipAddress?: string;

  // Tracking ID will be auto-generated, so it's optional in DTO
  @IsOptional()
  @IsString()
  trackingId?: string;
}

import { PartialType } from '@nestjs/mapped-types';

export class UpdateCheckoutDto extends PartialType(CreateCheckoutDto) {
  @IsOptional()
  @IsIn(['pending', 'verified', 'rejected'])
  status?: 'pending' | 'verified' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}