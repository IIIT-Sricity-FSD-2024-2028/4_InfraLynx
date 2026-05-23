import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import {
  CreateSensorDeploymentDto, UpdateSensorDeploymentDto,
  CreateMaterialLogDto, UpdateMaterialLogDto,
} from './field-assets.dto';

@Injectable()
export class FieldAssetsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAllSensors() {
    const { rows } = await this.db.query('SELECT * FROM sensor_deployments ORDER BY installed_at DESC');
    return rows.map(this.mapSensor);
  }

  async findSensor(id: string) {
    const { rows } = await this.db.query('SELECT * FROM sensor_deployments WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Sensor "${id}" not found`);
    return this.mapSensor(rows[0]);
  }

  async createSensor(dto: CreateSensorDeploymentDto) {
    const id = `sensor-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO sensor_deployments (id, department_id, engineer_id, work_order_id, sensor_type, asset_location, serial_no, installed_at, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.workOrderId || null,
       dto.sensorType, dto.assetLocation || null, dto.serialNo || null,
       dto.status || 'ACTIVE', dto.notes || null],
    );
    return this.mapSensor(rows[0]);
  }

  async updateSensor(id: string, dto: UpdateSensorDeploymentDto) {
    const current = await this.findSensor(id);
    const { rows } = await this.db.query(
      `UPDATE sensor_deployments SET status=$1, sensor_type=$2, asset_location=$3, notes=$4 WHERE id=$5 RETURNING *`,
      [dto.status ?? current.status, dto.sensorType ?? current.sensorType,
       dto.assetLocation ?? current.assetLocation, dto.notes ?? current.notes, id],
    );
    return this.mapSensor(rows[0]);
  }

  async removeSensor(id: string) {
    await this.findSensor(id);
    await this.db.query('DELETE FROM sensor_deployments WHERE id = $1', [id]);
    return { deleted: true };
  }

  async findAllMaterials() {
    const { rows } = await this.db.query('SELECT * FROM material_logs ORDER BY created_at DESC');
    return rows.map(this.mapMaterial);
  }

  async findMaterial(id: string) {
    const { rows } = await this.db.query('SELECT * FROM material_logs WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Material log "${id}" not found`);
    return this.mapMaterial(rows[0]);
  }

  async createMaterial(dto: CreateMaterialLogDto) {
    const id = `matlog-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO material_logs (id, department_id, engineer_id, work_order_id, material, quantity, unit, used_on, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.workOrderId || null,
       dto.material, dto.quantity || null, dto.unit || null, dto.usedOn || null, dto.notes || null],
    );
    return this.mapMaterial(rows[0]);
  }

  async updateMaterial(id: string, dto: UpdateMaterialLogDto) {
    const current = await this.findMaterial(id);
    const { rows } = await this.db.query(
      `UPDATE material_logs SET material=$1, quantity=$2, unit=$3, used_on=$4, notes=$5 WHERE id=$6 RETURNING *`,
      [dto.material ?? current.material, dto.quantity ?? current.quantity,
       dto.unit ?? current.unit, dto.usedOn ?? current.usedOn, dto.notes ?? current.notes, id],
    );
    return this.mapMaterial(rows[0]);
  }

  async removeMaterial(id: string) {
    await this.findMaterial(id);
    await this.db.query('DELETE FROM material_logs WHERE id = $1', [id]);
    return { deleted: true };
  }

  private mapSensor(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      workOrderId: r.work_order_id,
      sensorType: r.sensor_type,
      assetLocation: r.asset_location,
      serialNo: r.serial_no,
      installedAt: r.installed_at,
      status: r.status,
      notes: r.notes,
    };
  }

  private mapMaterial(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      workOrderId: r.work_order_id,
      material: r.material,
      quantity: r.quantity,
      unit: r.unit,
      usedOn: r.used_on,
      notes: r.notes,
      createdAt: r.created_at,
    };
  }
}
