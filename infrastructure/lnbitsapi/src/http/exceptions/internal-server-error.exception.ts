import { HttpException, HttpStatus } from './http.exception';

export class InternalServerErrorException extends HttpException {
  constructor(message: string) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}
