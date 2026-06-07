import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductionModule } from './modules/production/production.module';
import { DailyEssentialsModule } from './modules/daily-essentials/daily-essentials.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DevicesModule } from './modules/devices/devices.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ExportsModule } from './modules/exports/exports.module';
import { PrintingModule } from './modules/printing/printing.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    OrdersModule,
    ProductionModule,
    DailyEssentialsModule,
    AnalyticsModule,
    NotificationsModule,
    DevicesModule,
    UploadsModule,
    ExportsModule,
    PrintingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
