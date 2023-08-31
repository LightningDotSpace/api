import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from '../crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify valid signature', () => {
    const isValid = service.verifySignature(
      'By_signing_this_message,_you_confirm_to_lightning.space_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_mpqhHHB1Dsx6ByB6D4cswrTFM8UuLrB4Su',
      'mpqhHHB1Dsx6ByB6D4cswrTFM8UuLrB4Su',
      'IFN0AS18lrcRr3EwS2VQ0cIPhIqQz88MTpB0JiIq16u5JHCkgnBZ6YmBrVKDHAdxcoaWAC9Rm5tIgY7nX908kS4=',
    );

    expect(isValid).toBeTruthy();
  });

  it('should verify invalid signature', () => {
    const isValid = service.verifySignature(
      'By_signing_this_message,_you_confirm_to_lightning.space_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_mpqhHHB1Dsx6ByB6D4cswrTFM8UuLrB4Su',
      'mpqhHHB1Dsx6ByB6D4cswrTFM8UuLrB4Su',
      'IFN0AS18lrcRr3EwS2VQ0cIPhIqQz88MTpB0JiIq15u5JHCkgnBZ6YmBrVKDHAdxcoaWAC9Rm5tIgY7nX908kS4=',
    );

    expect(isValid).toBeFalsy();
  });
});
