import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsStrongPassword({ minLength: 12, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }) password!: string;
}
