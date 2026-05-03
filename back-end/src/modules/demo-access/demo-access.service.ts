import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { citizenUsers, officialAccounts, officialRoles } from '../../data/seed.data';
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

let nextCitizenIdx = citizenUsers.length;
let nextOfficialIdx = officialAccounts.length;

function withoutPassword<T extends { password?: string }>(record: T) {
  const { password: _password, ...safeRecord } = record;
  return safeRecord;
}

@Injectable()
export class DemoAccessService {
  findOfficialRoles() {
    return officialRoles;
  }

  signInOfficial(dto: OfficialDemoSignInDto) {
    const account = officialAccounts.find((item) => item.email.toLowerCase() === dto.email.toLowerCase());

    if (!account || account.password !== dto.password || (dto.role && account.role !== dto.role)) {
      throw new UnauthorizedException('Demo official sign-in failed.');
    }

    return {
      demoOnly: true,
      authModel: 'in-memory',
      account: withoutPassword(account),
      session: {
        type: 'official',
        officialId: account.id,
        role: account.role,
        name: account.name,
        createdAt: new Date().toISOString(),
      },
    };
  }

  signInCitizen(dto: CitizenDemoSignInDto) {
    const normalizedIdentifier = dto.identifier.trim().toLowerCase();
    const citizen = citizenUsers.find((item) => {
      return item.aadhaar === normalizedIdentifier || item.email.toLowerCase() === normalizedIdentifier;
    });

    if (!citizen || citizen.password !== dto.password) {
      throw new UnauthorizedException('Demo citizen sign-in failed.');
    }

    return {
      demoOnly: true,
      authModel: 'in-memory',
      note: 'Citizen access is a prototype convenience. Citizens remain public requesters in the current domain model.',
      account: withoutPassword(citizen),
      session: {
        type: 'citizen',
        citizenId: citizen.id,
        citizenName: citizen.name,
        aadhaar: citizen.aadhaar,
        createdAt: new Date().toISOString(),
      },
    };
  }

  findCitizenByIdentifier(dto: CitizenLookupDto) {
    const normalizedIdentifier = dto.identifier.trim().toLowerCase();
    const citizen = citizenUsers.find((item) => {
      return item.aadhaar === normalizedIdentifier || item.email.toLowerCase() === normalizedIdentifier;
    });
    if (!citizen) {
      throw new NotFoundException('Citizen account not found.');
    }
    return withoutPassword(citizen);
  }

  findOfficialByEmail(dto: OfficialLookupDto) {
    const official = officialAccounts.find((item) => item.email.toLowerCase() === dto.email.toLowerCase());
    if (!official) {
      throw new NotFoundException('Official account not found.');
    }
    return withoutPassword(official);
  }

  resetCitizenPassword(dto: ResetPasswordDto) {
    const normalizedIdentifier = dto.identifier.trim().toLowerCase();
    const idx = citizenUsers.findIndex((item) => {
      return item.aadhaar === normalizedIdentifier || item.email.toLowerCase() === normalizedIdentifier;
    });
    if (idx === -1) {
      throw new NotFoundException('Citizen account not found.');
    }
    citizenUsers[idx] = { ...citizenUsers[idx], password: dto.password };
    return { updated: true };
  }

  resetOfficialPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.identifier.trim().toLowerCase();
    const idx = officialAccounts.findIndex((item) => item.email.toLowerCase() === normalizedEmail);
    if (idx === -1) {
      throw new NotFoundException('Official account not found.');
    }
    officialAccounts[idx] = { ...officialAccounts[idx], password: dto.password };
    return { updated: true };
  }

  // ── Citizen Registration ──────────────────────────────────────────────────

  registerCitizen(dto: CitizenRegisterDto) {
    const aadhaarMatch = citizenUsers.find((u) => u.aadhaar === dto.aadhaar);
    if (aadhaarMatch) {
      throw new BadRequestException('An account already exists for this Aadhaar number.');
    }

    const emailMatch = citizenUsers.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
    if (emailMatch) {
      throw new BadRequestException('This email is already linked to an existing citizen account.');
    }

    nextCitizenIdx++;
    const record = {
      id: `citizen-${String(nextCitizenIdx).padStart(3, '0')}`,
      aadhaar: dto.aadhaar,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      password: dto.password,
      preferredLanguage: dto.preferredLanguage || 'en',
      createdAt: new Date().toISOString(),
    };

    citizenUsers.unshift(record);
    return withoutPassword(record);
  }

  // ── Official Accounts CRUD ────────────────────────────────────────────────

  findAllOfficialAccounts() {
    return officialAccounts.map(withoutPassword);
  }

  findOneOfficialAccount(id: string) {
    const account = officialAccounts.find((a) => a.id === id);
    if (!account) throw new NotFoundException('Official account not found.');
    return withoutPassword(account);
  }

  createOfficialAccount(dto: CreateOfficialAccountDto) {
    const emailMatch = officialAccounts.find((a) => a.email.toLowerCase() === dto.email.toLowerCase());
    if (emailMatch) {
      throw new BadRequestException('An official account already exists for this email address.');
    }

    nextOfficialIdx++;
    const record = {
      id: `official-${String(nextOfficialIdx).padStart(2, '0')}`,
      role: dto.role,
      name: dto.name,
      email: dto.email.toLowerCase(),
      password: dto.password,
      departmentId: dto.departmentId || null,
    };

    officialAccounts.unshift(record);
    return withoutPassword(record);
  }

  updateOfficialAccount(id: string, dto: UpdateOfficialAccountDto) {
    const idx = officialAccounts.findIndex((a) => a.id === id);
    if (idx === -1) throw new NotFoundException('Official account not found.');

    if (dto.email) {
      const emailDup = officialAccounts.find(
        (a) => a.email.toLowerCase() === dto.email.toLowerCase() && a.id !== id,
      );
      if (emailDup) {
        throw new BadRequestException('An official account already exists for this email address.');
      }
    }

    const current = officialAccounts[idx];
    const updated = {
      ...current,
      ...dto,
      email: dto.email ? dto.email.toLowerCase() : current.email,
      departmentId: dto.departmentId !== undefined ? dto.departmentId : current.departmentId,
    };
    officialAccounts[idx] = updated;
    return withoutPassword(updated);
  }

  removeOfficialAccount(id: string) {
    const idx = officialAccounts.findIndex((a) => a.id === id);
    if (idx === -1) throw new NotFoundException('Official account not found.');
    officialAccounts.splice(idx, 1);
    return { deleted: true };
  }
}
