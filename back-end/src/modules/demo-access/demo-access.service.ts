import { Injectable, UnauthorizedException } from '@nestjs/common';
import { citizenUsers, officialAccounts, officialRoles } from '../../data/seed.data';
import { CitizenDemoSignInDto, OfficialDemoSignInDto } from './demo-access.dto';

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
        createdAt: new Date().toISOString(),
      },
    };
  }
}
