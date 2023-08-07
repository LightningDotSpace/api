import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CryptoService } from 'src/blockchain/services/crypto.service';
import { Config } from 'src/config/config';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { SignMessageDto } from 'src/subdomains/user/application/dto/sign-message.dto';
import { SignUpDto } from 'src/subdomains/user/application/dto/sign-up.dto';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { Wallet } from 'src/subdomains/user/domain/entities/wallet.entity';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { SignInDto } from '../dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    const existingWallet = await this.walletService.getByAddress(dto.address, false);
    if (existingWallet) throw new ConflictException('User already exists');

    if (!this.verifySignature(dto.address, dto.signature)) throw new BadRequestException('Invalid signature');

    const wallet = await this.walletService.createWallet(dto);
    return { accessToken: this.generateToken(wallet) };
  }

  async signIn({ address, signature }: SignInDto): Promise<AuthResponseDto> {
    const wallet = await this.walletService.getByAddress(address, true);
    if (!wallet) throw new NotFoundException('User not found');

    if (!this.verifySignature(address, signature)) throw new UnauthorizedException('Invalid credentials');

    return { accessToken: this.generateToken(wallet) };
  }

  getSignInfo(address: string): SignMessageDto {
    return {
      message: this.getSignMessage(address),
    };
  }

  private getSignMessage(address: string): string {
    return Config.auth.signMessage + address;
  }

  private verifySignature(address: string, signature: string): boolean {
    const message = this.getSignMessage(address);
    return this.cryptoService.verifySignature(message, address, signature);
  }

  private generateToken(wallet: Wallet): string {
    const payload: JwtPayload = {
      walletId: wallet.id,
      userId: wallet.user?.id,
      address: wallet.address,
      role: wallet.role,
    };
    return this.jwtService.sign(payload);
  }
}
