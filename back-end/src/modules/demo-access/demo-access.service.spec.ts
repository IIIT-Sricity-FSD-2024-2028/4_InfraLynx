import { UnauthorizedException } from '@nestjs/common';
import { DemoAccessService } from './demo-access.service';

describe('DemoAccessService', () => {
  let service: DemoAccessService;

  beforeEach(() => {
    service = new DemoAccessService();
  });

  it('signs in an official without returning the password', () => {
    const result = service.signInOfficial({
      email: 'administrator@crims.gov.in',
      password: 'Admin@2026',
      role: 'ADMINISTRATOR',
    });

    expect(result.demoOnly).toBe(true);
    expect(result.account).toMatchObject({
      role: 'ADMINISTRATOR',
      email: 'administrator@crims.gov.in',
    });
    expect(result.account).not.toHaveProperty('password');
  });

  it('rejects role mismatches in demo official access', () => {
    expect(() =>
      service.signInOfficial({
        email: 'administrator@crims.gov.in',
        password: 'Admin@2026',
        role: 'CFO',
      }),
    ).toThrow(UnauthorizedException);
  });
});
