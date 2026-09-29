import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { IamService } from '../application/iam.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from '@platform/contracts';

@Controller('auth')
export class IamController {
  constructor(private readonly iam: IamService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() request: FastifyRequest) {
    return { data: await this.iam.register(dto) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: FastifyRequest) {
    return { data: await this.iam.login(dto.email, dto.password, requestMeta(request)) };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Req() request: FastifyRequest) {
    return { data: await this.iam.refresh(dto.refreshToken, requestMeta(request)) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.iam.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.iam.me(user.id) };
  }
}

function requestMeta(request: FastifyRequest) {
  return { ip: request.ip, userAgent: request.headers['user-agent'], deviceId: typeof request.headers['x-device-id'] === 'string' ? request.headers['x-device-id'] : undefined };
}
