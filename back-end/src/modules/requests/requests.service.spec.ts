import { BadRequestException } from '@nestjs/common';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  let service: RequestsService;

  beforeEach(() => {
    service = new RequestsService();
  });

  it('creates public requests without requiring Aadhaar as the core identity', () => {
    const request = service.create({
      requestType: 'Complaint',
      categoryId: 'roads',
      requesterName: 'Public Requester',
      requesterContact: '9876543210',
      requesterEmail: 'public@example.com',
      title: 'Road shoulder damage',
      description: 'The road shoulder is damaged near the bus stop and needs attention.',
      locationText: 'Central Avenue bus stop',
      urgency: 'HIGH',
    });

    expect(request.status).toBe('RECEIVED');
    expect(request.publicReferenceNo).toMatch(/^CRIMS-\d{4}-\d{4}$/);
    expect(request.citizenAadhaar).toBe('PUBLIC-DEMO');
  });

  it('rejects invalid service categories', () => {
    expect(() =>
      service.create({
        requestType: 'Complaint',
        categoryId: 'missing',
        requesterName: 'Public Requester',
        requesterContact: '9876543210',
        requesterEmail: 'public@example.com',
        title: 'Road shoulder damage',
        description: 'The road shoulder is damaged near the bus stop and needs attention.',
        locationText: 'Central Avenue bus stop',
        urgency: 'HIGH',
      }),
    ).toThrow(BadRequestException);
  });
});
