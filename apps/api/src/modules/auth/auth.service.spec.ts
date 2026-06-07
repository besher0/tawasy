import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
}));

describe('AuthService', () => {
  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtService: any = {
    signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
    verifyAsync: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService);
  });

  it('throws when credentials are invalid', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.login({ phone: '0500000002', password: '12345678' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not create an offline session when the database is unavailable', async () => {
    prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.login({ phone: '0500000002', password: '12345678' }),
    ).rejects.toThrow('database unavailable');
  });

  it('returns tokens when credentials are valid', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: '1',
      name: 'Factory Manager',
      phone: '0500000002',
      role: 'FactoryManager',
      shopId: 'shop-1',
      isActive: true,
      passwordHash: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({ phone: '0500000002', password: '12345678' });

    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
