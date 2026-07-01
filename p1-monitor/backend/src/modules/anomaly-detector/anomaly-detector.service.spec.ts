import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectorService } from './anomaly-detector.service';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnomalyDetectorService],
    }).compile();

    service = module.get<AnomalyDetectorService>(AnomalyDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
