import { Injectable, NotFoundException } from '@nestjs/common';
import { sensorDeployments as seedSensors, taskMaterialLogs as seedMats } from '../data/seed.data';
import {
  CreateSensorDeploymentDto, UpdateSensorDeploymentDto,
  CreateMaterialLogDto, UpdateMaterialLogDto,
} from './field-assets.dto';

@Injectable()
export class FieldAssetsService {
  private sensors: any[] = seedSensors.map((s) => ({ ...s }));
  private materials: any[] = seedMats.map((m) => ({ ...m }));

  // --- Sensors ---
  findAllSensors() { return this.sensors; }
  findSensor(id: string) {
    const item = this.sensors.find((s) => s.id === id);
    if (!item) throw new NotFoundException(`Sensor "${id}" not found`);
    return item;
  }
  createSensor(dto: CreateSensorDeploymentDto) {
    const record = { id: `sensor-${Date.now()}`, installedAt: new Date().toISOString(), ...dto };
    this.sensors.unshift(record);
    return record;
  }
  updateSensor(id: string, dto: UpdateSensorDeploymentDto) {
    const idx = this.sensors.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundException(`Sensor "${id}" not found`);
    this.sensors[idx] = { ...this.sensors[idx], ...dto };
    return this.sensors[idx];
  }

  // --- Material Logs ---
  findAllMaterials() { return this.materials; }
  findMaterial(id: string) {
    const item = this.materials.find((m) => m.id === id);
    if (!item) throw new NotFoundException(`Material log "${id}" not found`);
    return item;
  }
  createMaterial(dto: CreateMaterialLogDto) {
    const record = { id: `matlog-${Date.now()}`, ...dto };
    this.materials.unshift(record);
    return record;
  }
  updateMaterial(id: string, dto: UpdateMaterialLogDto) {
    const idx = this.materials.findIndex((m) => m.id === id);
    if (idx === -1) throw new NotFoundException(`Material log "${id}" not found`);
    this.materials[idx] = { ...this.materials[idx], ...dto };
    return this.materials[idx];
  }
}
