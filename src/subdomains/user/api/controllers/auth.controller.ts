import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto } from '../../application/dto/auth-response.dto';
import { SignInDto } from '../../application/dto/sign-in.dto';
import { SignMessageDto } from '../../application/dto/sign-message.dto';
import { SignUpDto } from '../../application/dto/sign-up.dto';
import { AuthService } from '../../application/services/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  @ApiCreatedResponse({ type: AuthResponseDto })
  authenticate(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.authenticate(dto);
  }

  @Post('sign-up')
  @ApiCreatedResponse({ type: AuthResponseDto })
  signUp(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.signUp(dto);
  }

  @Post('sign-in')
  @ApiCreatedResponse({ type: AuthResponseDto })
  signIn(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @Get('sign-message')
  @ApiOkResponse({ type: SignMessageDto })
  getSignMessage(@Query('address') address: string): SignMessageDto {
    return this.authService.getSignInfo(address);
  }
}
