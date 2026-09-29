import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { IamHardeningService } from '../application/iam-hardening.service';
import {
  EmailVerifyRequestDto, MfaCodeDto, MfaLoginDto, OAuthCallbackDto,
  PasswordChangeDto, PasswordResetConfirmDto, PasswordResetRequestDto,
  PhoneVerifyConfirmDto, PhoneVerifyRequestDto,
} from './dto/hardening.dto';

@Controller('auth')
export class IamHardeningController {
  constructor(private readonly hardening: IamHardeningService) {}

  // --- Email verification ----------------------------------------------------
  @Post('email/verify-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AccessTokenGuard)
  async requestEmailVerification(@CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return { data: await this.hardening.requestEmailVerification(user.id, requestMeta(request)) };
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: EmailVerifyRequestDto) {
    return { data: await this.hardening.verifyEmail(dto.token) };
  }

  // --- Phone OTP ----------------------------------------------------------------
  @Post('phone/verify-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AccessTokenGuard)
  async requestPhoneOtp(@CurrentUser() user: AuthenticatedUser, @Body() dto: PhoneVerifyRequestDto) {
    return { data: await this.hardening.requestPhoneOtp(user.id, dto.phoneE164) };
  }

  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async verifyPhoneOtp(@CurrentUser() user: AuthenticatedUser, @Body() dto: PhoneVerifyConfirmDto) {
    return { data: await this.hardening.verifyPhoneOtp(user.id, dto.phoneE164, dto.code) };
  }

  // --- Password flows ---------------------------------------------------------------
  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto, @Req() request: FastifyRequest) {
    return { data: await this.hardening.requestPasswordReset(dto.email, requestMeta(request)) };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return { data: await this.hardening.resetPassword(dto.token, dto.newPassword) };
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: PasswordChangeDto) {
    return { data: await this.hardening.changePassword(user.id, dto.currentPassword, dto.newPassword) };
  }

  // --- Sessions --------------------------------------------------------------------------
  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.hardening.listSessions(user.id) };
  }

  @Post('sessions/logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.hardening.logoutAll(user.id) };
  }

  // --- MFA (TOTP) --------------------------------------------------------------------------
  @Post('mfa/enroll')
  @UseGuards(AccessTokenGuard)
  async enrollTotp(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.hardening.enrollTotp(user.id) };
  }

  @Post('mfa/activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async activateTotp(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    return { data: await this.hardening.activateTotp(user.id, dto.code) };
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async disableTotp(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    return { data: await this.hardening.disableTotp(user.id, dto.code) };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfaLogin(@Body() dto: MfaLoginDto, @Req() request: FastifyRequest) {
    return { data: await this.hardening.verifyMfaLogin(dto.challengeToken, dto.code, requestMeta(request)) };
  }

  // --- OAuth ----------------------------------------------------------------------------------
  @Get('oauth/:provider/authorize')
  async oauthAuthorize(@Param('provider') provider: string, @Req() _request: FastifyRequest) {
    const redirectUri = `${this.hardening.configRedirectBase}/${provider}/callback`;
    return { data: await this.hardening.oauthAuthorizeUrl(provider, redirectUri) };
  }

  @Post('oauth/:provider/callback')
  @HttpCode(HttpStatus.OK)
  async oauthCallback(@Param('provider') provider: string, @Body() dto: OAuthCallbackDto, @Req() request: FastifyRequest) {
    const redirectUri = `${this.hardening.configRedirectBase}/${provider}/callback`;
    return { data: await this.hardening.oauthCallback(provider, dto.code, dto.state, redirectUri, requestMeta(request)) };
  }
}

function requestMeta(request: FastifyRequest): { ip: string; userAgent?: string; requestId: string } {
  const userAgent = typeof request.headers['user-agent'] === 'string' ? (request.headers['user-agent'] as string) : undefined;
  return { ip: request.ip, requestId: String(request.id ?? ''), ...(userAgent !== undefined ? { userAgent } : {}) };
}
