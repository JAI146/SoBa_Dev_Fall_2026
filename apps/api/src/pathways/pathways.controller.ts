import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common'; import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../auth/auth-principal'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CreatePathwayApplicationDto, SelectPathwayPartnersDto, UpdateChecklistItemDto, VerifyPathwayApplicationDto } from './dto/pathways.dto'; import { PathwaysService } from './pathways.service';
@ApiTags('pathways') @ApiBearerAuth() @UseGuards(VerifiedEmailGuard) @Controller('pathways')
export class PathwaysController { constructor(private readonly service:PathwaysService){}
 @Get() list(@CurrentUser() p:AuthPrincipal){return this.service.list(p.userId)}
 @Get(':key/partners') partners(@CurrentUser() p:AuthPrincipal,@Param('key') key:string){return this.service.listPartners(p.userId,key)}
 @Post('applications') create(@CurrentUser() p:AuthPrincipal,@Body() body:CreatePathwayApplicationDto){return this.service.createOrResume(p.userId,body)}
 @Patch('applications/:id/verify') verify(@CurrentUser() p:AuthPrincipal,@Param('id',ParseUUIDPipe) id:string,@Body() body:VerifyPathwayApplicationDto){return this.service.verify(p.userId,id,body)}
 @Patch('applications/:id/partners') select(@CurrentUser() p:AuthPrincipal,@Param('id',ParseUUIDPipe) id:string,@Body() body:SelectPathwayPartnersDto){return this.service.selectPartners(p.userId,id,body)}
 @Post('applications/:id/submit') submit(@CurrentUser() p:AuthPrincipal,@Param('id',ParseUUIDPipe) id:string){return this.service.submit(p.userId,id)}
 @Get('applications/:id') get(@CurrentUser() p:AuthPrincipal,@Param('id',ParseUUIDPipe) id:string){return this.service.get(p.userId,id)}
 @Patch('checklist-items/:id') checklist(@CurrentUser() p:AuthPrincipal,@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateChecklistItemDto){return this.service.updateChecklist(p.userId,id,body)}
}
