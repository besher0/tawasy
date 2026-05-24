import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe.skip('SugarPrecision API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.todo('Shop employee creates urgent multi-cake order and submits to factory');
  it.todo('Factory manager reviews incoming orders and progresses kanban statuses');
  it.todo('Next-day essentials flow can add update and submit requisition');
  it.todo('Analytics endpoints provide near real-time snapshots');
  it.todo('PDF + Excel exports and direct print job endpoint work');

  it('rejects anonymous access to protected endpoint', async () => {
    await request(app.getHttpServer()).get('/orders').expect(401);
  });
});
