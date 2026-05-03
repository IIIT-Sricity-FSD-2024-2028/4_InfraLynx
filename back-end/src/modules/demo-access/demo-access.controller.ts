import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CitizenDemoSignInDto,
  CitizenLookupDto,
  CitizenRegisterDto,
  CreateOfficialAccountDto,
  OfficialLookupDto,
  OfficialDemoSignInDto,
  ResetPasswordDto,
  UpdateOfficialAccountDto,
} from './demo-access.dto';
import { DemoAccessService } from './demo-access.service';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

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

  @Post('citizen/register')
  registerCitizen(@Body() dto: CitizenRegisterDto) {
    return this.svc.registerCitizen(dto);
  }

  @Post('citizen/lookup')
  lookupCitizen(@Body() dto: CitizenLookupDto) {
    return this.svc.findCitizenByIdentifier(dto);
  }

  @Post('official/lookup')
  lookupOfficial(@Body() dto: OfficialLookupDto) {
    return this.svc.findOfficialByEmail(dto);
  }

  @Patch('citizen/reset-password')
  resetCitizenPassword(@Body() dto: ResetPasswordDto) {
    return this.svc.resetCitizenPassword(dto);
  }

  @Patch('official/reset-password')
  resetOfficialPassword(@Body() dto: ResetPasswordDto) {
    return this.svc.resetOfficialPassword(dto);
  }

  // ── Official Accounts CRUD ─────────────────────────────────────

  @Get('official-accounts')
  @UseGuards(RolesGuard)
  findAllAccounts() {
    return this.svc.findAllOfficialAccounts();
  }

  @Get('official-accounts/:id')
  @UseGuards(RolesGuard)
  findOneAccount(@Param('id') id: string) {
    return this.svc.findOneOfficialAccount(id);
  }

  @Post('official-accounts')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  createAccount(@Body() dto: CreateOfficialAccountDto) {
    return this.svc.createOfficialAccount(dto);
  }

  @Patch('official-accounts/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateOfficialAccountDto) {
    return this.svc.updateOfficialAccount(id, dto);
  }

  @Delete('official-accounts/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  removeAccount(@Param('id') id: string) {
    return this.svc.removeOfficialAccount(id);
  }
}
