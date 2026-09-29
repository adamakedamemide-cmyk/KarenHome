import { Body, Controller, Get, Param, Post } from '@nestjs/common';
@Controller('listings')
export class ListingsController {
  @Post() create(@Body() body:unknown){return {data:{accepted:true,body}};}
  @Post(':id/publish') publish(@Param('id') id:string){return {data:{id,status:'published'}};}
  @Get(':id') get(@Param('id') id:string){return {data:{id}};}
}
