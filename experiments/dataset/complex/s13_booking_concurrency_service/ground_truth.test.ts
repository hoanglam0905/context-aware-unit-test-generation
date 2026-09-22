import {
  BookingConcurrencyService,
  IDistributedLock,
  IBookingRepository,
  ITimeProvider,
  Booking,
  InvalidBookingTimeException,
  LockAcquisitionException,
  ResourceAlreadyBookedException,
  BookingNotFoundException,
  BookingExpiredException,
  UnauthorizedBookingAccessException,
} from './service';

describe('BookingConcurrencyService (Ground Truth)', () => {
  let lock: jest.Mocked<IDistributedLock>;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let timeProvider: jest.Mocked<ITimeProvider>;
  let service: BookingConcurrencyService;

  const fixedNow = new Date('2026-09-22T10:00:00Z');

  beforeEach(() => {
    lock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    bookingRepo = {
      findOverlapping: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      save: jest.fn().mockImplementation(async (b) => ({ ...b })),
      update: jest.fn().mockImplementation(async (b) => ({ ...b })),
    };
    timeProvider = {
      now: jest.fn().mockReturnValue(fixedNow),
    };

    service = new BookingConcurrencyService(lock, bookingRepo, timeProvider);
  });

  describe('holdSlot', () => {
    it('should throw InvalidBookingTimeException if startTime >= endTime', async () => {
      const start = new Date('2026-09-22T12:00:00Z');
      const end = new Date('2026-09-22T11:00:00Z');

      await expect(
        service.holdSlot('ROOM-1', 'USER-1', start, end, 100)
      ).rejects.toThrow(InvalidBookingTimeException);
    });

    it('should throw InvalidBookingTimeException if startTime is in the past', async () => {
      const pastStart = new Date('2026-09-22T09:00:00Z');
      const end = new Date('2026-09-22T11:00:00Z');

      await expect(
        service.holdSlot('ROOM-1', 'USER-1', pastStart, end, 100)
      ).rejects.toThrow(InvalidBookingTimeException);
    });

    it('should throw LockAcquisitionException if distributed lock cannot be acquired', async () => {
      lock.acquire.mockResolvedValue(false);
      const start = new Date('2026-09-22T11:00:00Z');
      const end = new Date('2026-09-22T12:00:00Z');

      await expect(
        service.holdSlot('ROOM-1', 'USER-1', start, end, 100)
      ).rejects.toThrow(LockAcquisitionException);

      expect(lock.release).not.toHaveBeenCalled();
    });

    it('should throw ResourceAlreadyBookedException when overlapping CONFIRMED booking exists', async () => {
      const start = new Date('2026-09-22T11:00:00Z');
      const end = new Date('2026-09-22T12:00:00Z');

      bookingRepo.findOverlapping.mockResolvedValue([
        {
          id: 'BK-CONFIRMED',
          resourceId: 'ROOM-1',
          userId: 'ANOTHER-USER',
          startTime: start,
          endTime: end,
          price: 100,
          status: 'CONFIRMED',
          heldUntil: fixedNow,
          createdAt: fixedNow,
        },
      ]);

      await expect(
        service.holdSlot('ROOM-1', 'USER-1', start, end, 100)
      ).rejects.toThrow(ResourceAlreadyBookedException);

      expect(lock.release).toHaveBeenCalledWith('lock:resource:ROOM-1');
    });

    it('should throw ResourceAlreadyBookedException when overlapping active HELD booking exists', async () => {
      const start = new Date('2026-09-22T11:00:00Z');
      const end = new Date('2026-09-22T12:00:00Z');
      const futureHeldUntil = new Date(fixedNow.getTime() + 5 * 60 * 1000);

      bookingRepo.findOverlapping.mockResolvedValue([
        {
          id: 'BK-HELD',
          resourceId: 'ROOM-1',
          userId: 'ANOTHER-USER',
          startTime: start,
          endTime: end,
          price: 100,
          status: 'HELD',
          heldUntil: futureHeldUntil,
          createdAt: fixedNow,
        },
      ]);

      await expect(
        service.holdSlot('ROOM-1', 'USER-1', start, end, 100)
      ).rejects.toThrow(ResourceAlreadyBookedException);

      expect(lock.release).toHaveBeenCalledWith('lock:resource:ROOM-1');
    });

    it('should successfully hold slot when overlapping HELD booking is already expired', async () => {
      const start = new Date('2026-09-22T11:00:00Z');
      const end = new Date('2026-09-22T12:00:00Z');
      const expiredHeldUntil = new Date(fixedNow.getTime() - 1000); // 1 sec in past

      bookingRepo.findOverlapping.mockResolvedValue([
        {
          id: 'BK-EXPIRED',
          resourceId: 'ROOM-1',
          userId: 'ANOTHER-USER',
          startTime: start,
          endTime: end,
          price: 100,
          status: 'HELD',
          heldUntil: expiredHeldUntil,
          createdAt: fixedNow,
        },
      ]);

      const result = await service.holdSlot('ROOM-1', 'USER-1', start, end, 150);

      expect(result.status).toBe('HELD');
      expect(result.price).toBe(150);
      expect(result.heldUntil.getTime()).toBe(fixedNow.getTime() + 10 * 60 * 1000);
      expect(bookingRepo.save).toHaveBeenCalled();
      expect(lock.release).toHaveBeenCalledWith('lock:resource:ROOM-1');
    });
  });

  describe('confirmBooking', () => {
    it('should throw BookingNotFoundException if booking not found', async () => {
      bookingRepo.findById.mockResolvedValue(null);

      await expect(service.confirmBooking('BK-999', 'USER-1')).rejects.toThrow(
        BookingNotFoundException
      );
    });

    it('should throw UnauthorizedBookingAccessException if userId does not match', async () => {
      bookingRepo.findById.mockResolvedValue({
        id: 'BK-1',
        resourceId: 'ROOM-1',
        userId: 'USER-1',
        startTime: new Date(),
        endTime: new Date(),
        price: 100,
        status: 'HELD',
        heldUntil: new Date(fixedNow.getTime() + 5000),
        createdAt: fixedNow,
      });

      await expect(service.confirmBooking('BK-1', 'DIFFERENT-USER')).rejects.toThrow(
        UnauthorizedBookingAccessException
      );
    });

    it('should be idempotent and return booking if already CONFIRMED', async () => {
      const confirmedBooking: Booking = {
        id: 'BK-1',
        resourceId: 'ROOM-1',
        userId: 'USER-1',
        startTime: new Date(),
        endTime: new Date(),
        price: 100,
        status: 'CONFIRMED',
        heldUntil: fixedNow,
        createdAt: fixedNow,
      };
      bookingRepo.findById.mockResolvedValue(confirmedBooking);

      const result = await service.confirmBooking('BK-1', 'USER-1');
      expect(result.status).toBe('CONFIRMED');
      expect(bookingRepo.update).not.toHaveBeenCalled();
    });

    it('should mark EXPIRED and throw BookingExpiredException if heldUntil has passed', async () => {
      const expiredBooking: Booking = {
        id: 'BK-1',
        resourceId: 'ROOM-1',
        userId: 'USER-1',
        startTime: new Date(),
        endTime: new Date(),
        price: 100,
        status: 'HELD',
        heldUntil: new Date(fixedNow.getTime() - 1000), // expired
        createdAt: fixedNow,
      };
      bookingRepo.findById.mockResolvedValue(expiredBooking);

      await expect(service.confirmBooking('BK-1', 'USER-1')).rejects.toThrow(
        BookingExpiredException
      );

      expect(bookingRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'EXPIRED' })
      );
    });

    it('should confirm booking successfully within hold period', async () => {
      const validBooking: Booking = {
        id: 'BK-1',
        resourceId: 'ROOM-1',
        userId: 'USER-1',
        startTime: new Date(),
        endTime: new Date(),
        price: 100,
        status: 'HELD',
        heldUntil: new Date(fixedNow.getTime() + 60000),
        createdAt: fixedNow,
      };
      bookingRepo.findById.mockResolvedValue(validBooking);

      const result = await service.confirmBooking('BK-1', 'USER-1');

      expect(result.status).toBe('CONFIRMED');
      expect(bookingRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' })
      );
    });
  });
});
