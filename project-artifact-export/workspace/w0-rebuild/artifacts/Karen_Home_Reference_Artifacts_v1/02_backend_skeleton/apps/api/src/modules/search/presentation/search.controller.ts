import { Body, Controller, Post } from '@nestjs/common';
@Controller('search')
export class SearchController { @Post('listings') search(@Body() query:unknown){return {data:[],meta:{nextCursor:null,query}};} }
