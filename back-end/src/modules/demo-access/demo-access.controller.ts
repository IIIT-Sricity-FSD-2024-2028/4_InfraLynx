import { Body, Controller, Get, Post } from '@nestjs/common';
import { CitizenDemoSignInDto, OfficialDemoSignInDto } from './demo-access.dto';
import { DemoAccessService } from './demo-access.service';

@Controller('demo-access')
export class DemoAccessController {
  constructor(private readonly svc: DemoAccessService) {}

  @Get('roles')
  findOfficialRoles() {
    return this.svc.findOfficialRoles();
  }

  @Post('official/sign-in')
  signInOfficial(@Body() dto: OfficialDemoSignInDto) {
    return this.svc.signInOfficial(dto);
  }

  @Post('citizen/sign-in')
  signInCitizen(@Body() dto: CitizenDemoSignInDto) {
    return this.svc.signInCitizen(dto);
  }
}
