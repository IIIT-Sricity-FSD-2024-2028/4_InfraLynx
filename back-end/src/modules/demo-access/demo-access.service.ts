import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
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
import { officialRoles } from '../../data/seed.data';

function withoutPassword<T extends { password?: string }>(record: T) {
  const { password: _password, ...safeRecord } = record;
  return safeRecord;
}

@Injectable()
export class DemoAccessService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  findOfficialRoles() {
    return officialRoles;
  }

  async signInOfficial(dto: OfficialDemoSignInDto) {
    const { rows } = await this.db.query('SELECT * FROM official_accounts WHERE LOWER(email) = LOWER($1)', [dto.email]);
    const account = rows[0];
    if (!account || account.password !== dto.password || (dto.role && account.role !== dto.role)) {
      throw new UnauthorizedException('Demo official sign-in failed.');
    }
    return {
      demoOnly: true,
      authModel: 'postgresql',
      account: withoutPassword(this.mapOfficial(account)),
      session: {
        type: 'official',
        officialId: account.id,
        role: account.role,
        name: account.name,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async signInCitizen(dto: CitizenDemoSignInDto) {
    const normalized = dto.identifier.trim().toLowerCase();
    const { rows } = await this.db.query('SELECT * FROM citizen_users WHERE aadhaar = $1 OR LOWER(email) = $2', [normalized, normalized]);
    const citizen = rows[0];
    if (!citizen || citizen.password !== dto.password) throw new UnauthorizedException('Demo citizen sign-in failed.');
    return {
      demoOnly: true,
      authModel: 'postgresql',
      note: 'Citizen access is a prototype convenience. Citizens remain public requesters in the current domain model.',
      account: withoutPassword(this.mapCitizen(citizen)),
      session: {
        type: 'citizen',
        citizenId: citizen.id,
        citizenName: citizen.name,
        aadhaar: citizen.aadhaar,
        email: citizen.email,
        phone: citizen.phone,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async findCitizenByIdentifier(dto: CitizenLookupDto) {
    const normalized = dto.identifier.trim().toLowerCase();
    const { rows } = await this.db.query('SELECT * FROM citizen_users WHERE aadhaar = $1 OR LOWER(email) = $2', [normalized, normalized]);
    if (!rows.length) throw new NotFoundException('Citizen account not found.');
    return withoutPassword(this.mapCitizen(rows[0]));
  }

  async findOfficialByEmail(dto: OfficialLookupDto) {
    const { rows } = await this.db.query('SELECT * FROM official_accounts WHERE LOWER(email) = LOWER($1)', [dto.email]);
    if (!rows.length) throw new NotFoundException('Official account not found.');
    return withoutPassword(this.mapOfficial(rows[0]));
  }

  async resetCitizenPassword(dto: ResetPasswordDto) {
    const normalized = dto.identifier.trim().toLowerCase();
    const { rows: existing } = await this.db.query('SELECT id FROM citizen_users WHERE aadhaar = $1 OR LOWER(email) = $2', [normalized, normalized]);
    if (!existing.length) throw new NotFoundException('Citizen account not found.');
    await this.db.query('UPDATE citizen_users SET password = $1 WHERE id = $2', [dto.password, existing[0].id]);
    return { updated: true };
  }

  async resetOfficialPassword(dto: ResetPasswordDto) {
    const normalized = dto.identifier.trim().toLowerCase();
    const { rows: existing } = await this.db.query('SELECT id FROM official_accounts WHERE LOWER(email) = $1', [normalized]);
    if (!existing.length) throw new NotFoundException('Official account not found.');
    await this.db.query('UPDATE official_accounts SET password = $1 WHERE id = $2', [dto.password, existing[0].id]);
    return { updated: true };
  }

  async registerCitizen(dto: CitizenRegisterDto) {
    const { rows: aadhaarMatch } = await this.db.query('SELECT id FROM citizen_users WHERE aadhaar = $1', [dto.aadhaar]);
    if (aadhaarMatch.length) throw new BadRequestException('An account already exists for this Aadhaar number.');
    const { rows: emailMatch } = await this.db.query('SELECT id FROM citizen_users WHERE LOWER(email) = LOWER($1)', [dto.email]);
    if (emailMatch.length) throw new BadRequestException('This email is already linked to an existing citizen account.');

    const countRes = await this.db.query('SELECT COUNT(*) AS cnt FROM citizen_users');
    const idx = parseInt(countRes.rows[0].cnt) + 1;
    const id = `citizen-${String(idx).padStart(3, '0')}`;
    const { rows } = await this.db.query(
      `INSERT INTO citizen_users (id, aadhaar, name, phone, email, password, preferred_language) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, dto.aadhaar, dto.name, dto.phone, dto.email, dto.password, dto.preferredLanguage || 'en'],
    );
    return withoutPassword(this.mapCitizen(rows[0]));
  }

  async findAllOfficialAccounts() {
    const { rows } = await this.db.query('SELECT * FROM official_accounts ORDER BY id');
    return rows.map(r => withoutPassword(this.mapOfficial(r)));
  }

  async findOneOfficialAccount(id: string) {
    const { rows } = await this.db.query('SELECT * FROM official_accounts WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Official account not found.');
    return withoutPassword(this.mapOfficial(rows[0]));
  }

  async createOfficialAccount(dto: CreateOfficialAccountDto) {
    const { rows: emailMatch } = await this.db.query('SELECT id FROM official_accounts WHERE LOWER(email) = LOWER($1)', [dto.email]);
    if (emailMatch.length) throw new BadRequestException('An official account already exists for this email address.');
    const countRes = await this.db.query('SELECT COUNT(*) AS cnt FROM official_accounts');
    const idx = parseInt(countRes.rows[0].cnt) + 1;
    const id = `official-${String(idx).padStart(2, '0')}`;
    const { rows } = await this.db.query(
      `INSERT INTO official_accounts (id, role, name, email, password, department_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, dto.role, dto.name, dto.email.toLowerCase(), dto.password, dto.departmentId || null],
    );
    return withoutPassword(this.mapOfficial(rows[0]));
  }

  async updateOfficialAccount(id: string, dto: UpdateOfficialAccountDto) {
    const { rows: existing } = await this.db.query('SELECT * FROM official_accounts WHERE id = $1', [id]);
    if (!existing.length) throw new NotFoundException('Official account not found.');
    if (dto.email) {
      const { rows: emailDup } = await this.db.query('SELECT id FROM official_accounts WHERE LOWER(email) = LOWER($1) AND id <> $2', [dto.email, id]);
      if (emailDup.length) throw new BadRequestException('An official account already exists for this email address.');
    }
    const current = this.mapOfficial(existing[0]);
    const { rows } = await this.db.query(
      `UPDATE official_accounts SET name=$1, email=$2, role=$3, department_id=$4 WHERE id=$5 RETURNING *`,
      [dto.name ?? current.name, dto.email ? dto.email.toLowerCase() : current.email,
       dto.role ?? current.role, dto.departmentId !== undefined ? dto.departmentId : current.departmentId, id],
    );
    return withoutPassword(this.mapOfficial(rows[0]));
  }

  async removeOfficialAccount(id: string) {
    const { rows } = await this.db.query('SELECT id FROM official_accounts WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Official account not found.');
    await this.db.query('DELETE FROM official_accounts WHERE id = $1', [id]);
    return { deleted: true };
  }

  private mapCitizen(r: any) {
    return {
      id: r.id,
      aadhaar: r.aadhaar,
      name: r.name,
      phone: r.phone,
      email: r.email,
      password: r.password,
      preferredLanguage: r.preferred_language,
      createdAt: r.created_at,
    };
  }

  private mapOfficial(r: any) {
    return {
      id: r.id,
      role: r.role,
      name: r.name,
      email: r.email,
      password: r.password,
      departmentId: r.department_id,
    };
  }
}
