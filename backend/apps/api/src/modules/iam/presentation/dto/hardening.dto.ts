import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class EmailVerifyRequestDto {
  @IsString() token!: string;
}

export class PhoneVerifyRequestDto {
  @Matches(/^\+[1-9][0-9]{7,14}$/) phoneE164!: string;
}

export class PhoneVerifyConfirmDto {
  @Matches(/^\+[1-9][0-9]{7,14}$/) phoneE164!: string;
  @Matches(/^\d{6}$/) code!: string;
}

export class PasswordResetRequestDto {
  @IsEmail() email!: string;
}

export class PasswordResetConfirmDto {
  @IsString() @MinLength(32) token!: string;
  @IsString() @MinLength(12) newPassword!: string;
}

export class PasswordChangeDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(12) newPassword!: string;
}

export class MfaCodeDto {
  @Matches(/^\d{6}$/) code!: string;
}

export class MfaLoginDto {
  @IsString() @MinLength(20) challengeToken!: string;
  @Matches(/^\d{6}$/) code!: string;
}

export class OAuthCallbackDto {
  @IsString() @MinLength(1) @MaxLength(2048) code!: string;
}
