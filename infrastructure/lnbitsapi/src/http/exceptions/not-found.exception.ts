import { HttpException, HttpStatus } from './http.exception';

export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(HttpStatus.NOT_FOUND, message);
  }
}
