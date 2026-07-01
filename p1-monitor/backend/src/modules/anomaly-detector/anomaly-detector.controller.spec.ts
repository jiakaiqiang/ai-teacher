import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectorController } from './anomaly-detector.controller';

describe('AnomalyDetectorController', () => {
  let controller: AnomalyDetectorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnomalyDetectorController],
    }).compile();

    controller = module.get<AnomalyDetectorController>(AnomalyDetectorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
