import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreatePropertyHandler } from '../application/create-property.handler';
@Controller('properties')
export class PropertiesController {
  constructor(private readonly createHandler: CreatePropertyHandler) {}
  @Post() create(@Body() dto:CreatePropertyDto){return this.createHandler.execute(dto);}
  @Get(':id') get(@Param('id') id:string){return {data:{id}};}
}
