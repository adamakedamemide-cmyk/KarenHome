import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithAuth } from './auth.types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
  return request.user;
});
