import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto } from '../application/dto/auth-response.dto';
import { SignUpDto } from '../application/dto/sign-up.dto';
import { AuthService } from '../application/services/auth.service';
import { RateLimitGuard } from './rate-limit.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @ApiCreatedResponse({ type: AuthResponseDto })
  authenticate(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.authenticate(dto);
  }
}
