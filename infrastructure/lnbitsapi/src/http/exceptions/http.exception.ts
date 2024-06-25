export enum HttpStatus {
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export class HttpException extends Error {
  constructor(readonly status: HttpStatus, message: string) {
    super(message);
  }
}
