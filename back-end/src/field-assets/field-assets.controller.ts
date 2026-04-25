import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FieldAssetsService } from './field-assets.service';
import {
  CreateSensorDeploymentDto, UpdateSensorDeploymentDto,
  CreateMaterialLogDto, UpdateMaterialLogDto,
} from './field-assets.dto';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('field-assets')
@UseGuards(RolesGuard)
export class FieldAssetsController {
  constructor(private readonly svc: FieldAssetsService) {}

  // Sensors
  @Get('sensors') getSensors() { return this.svc.findAllSensors(); }
  @Get('sensors/:id') getSensor(@Param('id') id: string) { return this.svc.findSensor(id); }
  @Post('sensors') @Roles('ENGINEER') createSensor(@Body() dto: CreateSensorDeploymentDto) { return this.svc.createSensor(dto); }
  @Patch('sensors/:id') @Roles('ENGINEER', 'ADMINISTRATOR') updateSensor(@Param('id') id: string, @Body() dto: UpdateSensorDeploymentDto) { return this.svc.updateSensor(id, dto); }

  // Material logs
  @Get('materials') getMaterials() { return this.svc.findAllMaterials(); }
  @Get('materials/:id') getMaterial(@Param('id') id: string) { return this.svc.findMaterial(id); }
  @Post('materials') @Roles('ENGINEER') createMaterial(@Body() dto: CreateMaterialLogDto) { return this.svc.createMaterial(dto); }
  @Patch('materials/:id') @Roles('ENGINEER') updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialLogDto) { return this.svc.updateMaterial(id, dto); }
}
