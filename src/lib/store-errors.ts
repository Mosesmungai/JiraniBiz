export class BusinessNotFoundError extends Error {
  constructor() {
    super("Business not found");
    this.name = "BusinessNotFoundError";
  }
}

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found.");
    this.name = "BookingNotFoundError";
  }
}

export class BookingPermissionError extends Error {
  constructor() {
    super("You are not allowed to perform this booking action.");
    this.name = "BookingPermissionError";
  }
}

export class BookingStateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingStateConflictError";
  }
}

export class ServiceNotFoundError extends Error {
  constructor() {
    super("Selected service does not belong to this business.");
    this.name = "ServiceNotFoundError";
  }
}

export class NotBusinessOwnerError extends Error {
  constructor() {
    super("You do not own this business.");
    this.name = "NotBusinessOwnerError";
  }
}

export class DuplicateReviewError extends Error {
  constructor() {
    super("You have already reviewed this business.");
    this.name = "DuplicateReviewError";
  }
}

export class BusinessSlugConflictError extends Error {
  constructor() {
    super("A business with this slug already exists.");
    this.name = "BusinessSlugConflictError";
  }
}
