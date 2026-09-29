import { Module } from '@nestjs/common';
import { ListingsController } from './presentation/listings.controller';
@Module({controllers:[ListingsController]})
export class ListingsModule {}
