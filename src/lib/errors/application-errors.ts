export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = "No autenticado") {
    super(message, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = "No autorizado") {
    super(message, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Recurso no encontrado") {
    super(message, "NOT_FOUND_ERROR");
  }
}

export class ExternalApiError extends ApplicationError {
  constructor(message = "Error al consumir API externa") {
    super(message, "EXTERNAL_API_ERROR");
  }
}

export class AIProviderError extends ApplicationError {
  constructor(message = "Error del proveedor de IA") {
    super(message, "AI_PROVIDER_ERROR");
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message = "Error de base de datos") {
    super(message, "DATABASE_ERROR");
  }
}