export type BookingStatus = 'HELD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  price: number;
  status: BookingStatus;
  heldUntil: Date;
  createdAt: Date;
}

export class InvalidBookingTimeException extends Error {
  constructor(message = 'Invalid booking time window') {
    super(message);
    this.name = 'InvalidBookingTimeException';
  }
}

export class LockAcquisitionException extends Error {
  constructor(resourceId: string) {
    super(`Could not acquire distributed lock for resource: ${resourceId}`);
    this.name = 'LockAcquisitionException';
  }
}

export class ResourceAlreadyBookedException extends Error {
  constructor(resourceId: string) {
    super(`Resource ${resourceId} is already booked or held during this timeframe`);
    this.name = 'ResourceAlreadyBookedException';
  }
}

export class BookingNotFoundException extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} not found`);
    this.name = 'BookingNotFoundException';
  }
}

export class BookingExpiredException extends Error {
  constructor(bookingId: string) {
    super(`Hold duration for booking ${bookingId} has expired`);
    this.name = 'BookingExpiredException';
  }
}

export class UnauthorizedBookingAccessException extends Error {
  constructor() {
    super('User is not authorized to confirm this booking');
    this.name = 'UnauthorizedBookingAccessException';
  }
}

export interface IDistributedLock {
  acquire(lockKey: string, ttlSeconds: number): Promise<boolean>;
  release(lockKey: string): Promise<void>;
}

export interface IBookingRepository {
  findOverlapping(resourceId: string, startTime: Date, endTime: Date): Promise<Booking[]>;
  findById(bookingId: string): Promise<Booking | null>;
  save(booking: Booking): Promise<Booking>;
  update(booking: Booking): Promise<Booking>;
}

export interface ITimeProvider {
  now(): Date;
}

export class BookingConcurrencyService {
  private static readonly HOLD_DURATION_MINUTES = 10;
  private static readonly LOCK_TTL_SECONDS = 5;

  constructor(
    private readonly lock: IDistributedLock,
    private readonly bookingRepo: IBookingRepository,
    private readonly timeProvider: ITimeProvider = { now: () => new Date() }
  ) {}

  public async holdSlot(
    resourceId: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    price: number
  ): Promise<Booking> {
    const now = this.timeProvider.now();

    if (startTime.getTime() >= endTime.getTime()) {
      throw new InvalidBookingTimeException('Start time must precede end time');
    }

    if (startTime.getTime() < now.getTime()) {
      throw new InvalidBookingTimeException('Cannot book time in the past');
    }

    const lockKey = `lock:resource:${resourceId}`;
    const acquired = await this.lock.acquire(lockKey, BookingConcurrencyService.LOCK_TTL_SECONDS);
    if (!acquired) {
      throw new LockAcquisitionException(resourceId);
    }

    try {
      const overlaps = await this.bookingRepo.findOverlapping(resourceId, startTime, endTime);

      const hasConflict = overlaps.some((b) => {
        if (b.status === 'CONFIRMED') return true;
        if (b.status === 'HELD' && b.heldUntil.getTime() > now.getTime()) return true;
        return false;
      });

      if (hasConflict) {
        throw new ResourceAlreadyBookedException(resourceId);
      }

      const heldUntil = new Date(now.getTime() + BookingConcurrencyService.HOLD_DURATION_MINUTES * 60 * 1000);
      const newBooking: Booking = {
        id: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        resourceId,
        userId,
        startTime,
        endTime,
        price,
        status: 'HELD',
        heldUntil,
        createdAt: now,
      };

      return await this.bookingRepo.save(newBooking);
    } finally {
      await this.lock.release(lockKey);
    }
  }

  public async confirmBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }

    if (booking.userId !== userId) {
      throw new UnauthorizedBookingAccessException();
    }

    if (booking.status === 'CONFIRMED') {
      return booking; // Idempotent
    }

    const now = this.timeProvider.now();
    if (booking.status !== 'HELD' || booking.heldUntil.getTime() <= now.getTime()) {
      booking.status = 'EXPIRED';
      await this.bookingRepo.update(booking);
      throw new BookingExpiredException(bookingId);
    }

    booking.status = 'CONFIRMED';
    return await this.bookingRepo.update(booking);
  }
}
