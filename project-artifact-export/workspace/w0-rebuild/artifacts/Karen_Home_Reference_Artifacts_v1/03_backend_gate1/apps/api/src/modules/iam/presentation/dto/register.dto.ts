import { IsEmail, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsStrongPassword({ minLength: 12, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }) password!: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) displayName?: string;
  @IsOptional() @IsString() @MaxLength(10) locale?: string;
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
}
