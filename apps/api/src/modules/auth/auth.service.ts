import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: string;
  role: string;
  shopId?: string | null;
  name: string;
  phone: string;
}

const offlineUsers = [
  {
    id: 'offline-admin',
    name: 'System Admin',
    phone: '0500000001',
    role: 'Admin',
    shopId: null,
  },
  {
    id: 'offline-factory-manager',
    name: 'Factory Manager',
    phone: '0500000002',
    role: 'FactoryManager',
    shopId: 'offline-factory',
  },
  {
    id: 'offline-shop-employee',
    name: 'Shop Employee',
    phone: '0500000003',
    role: 'ShopEmployee',
    shopId: 'offline-branch-olaya',
  },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly offlineAuthEnabled =
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_OFFLINE_AUTH === 'true';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

      if (!passwordMatches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        role: user.role,
        shopId: user.shopId,
        name: user.name,
        phone: user.phone,
      });

      await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          shopId: user.shopId,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (this.offlineAuthEnabled) {
        return this.loginOffline(dto, error);
      }

      throw error;
    }
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Session is not active');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      throw new ForbiddenException('Refresh token mismatch');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
      shopId: user.shopId,
      name: user.name,
      phone: user.phone,
    });

    await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

    return { tokens };
  }

  async logout(userId: string) {
    if (this.offlineAuthEnabled && userId.startsWith('offline-')) {
      return { message: 'Logged out' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logged out' };
  }

  async me(userId: string) {
    if (this.offlineAuthEnabled && userId.startsWith('offline-')) {
      const offlineUser = offlineUsers.find((user) => user.id === userId);
      if (!offlineUser) {
        throw new UnauthorizedException('User not found');
      }

      return { ...offlineUser, isActive: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        shopId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async loginOffline(dto: LoginDto, error: unknown) {
    if (dto.password !== '12345678') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = offlineUsers.find((entry) => entry.phone === dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const message = error instanceof Error ? error.message : 'Unknown database error';
    this.logger.warn(`Using offline login because database is unreachable. ${message}`);

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
      shopId: user.shopId,
      name: user.name,
      phone: user.phone,
    });

    return { user, tokens };
  }

  private async generateTokens(payload: JwtPayload) {
    const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'change_me_access_secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh_secret';
    const accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
    const refreshTtl = process.env.JWT_REFRESH_TTL ?? '30d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: accessTtl }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshTtl }),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh_secret';

    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: refreshSecret,
      });
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }
  }

  private async storeRefreshTokenHash(userId: string, token: string) {
    const refreshTokenHash = await bcrypt.hash(token, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
