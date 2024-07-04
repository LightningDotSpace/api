import { existsSync, readFileSync, writeFileSync } from 'fs';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { Util } from '../../shared/util';

export class CompareFileService {
  private readonly logger = new LnbitsApiLogger(CompareFileService);

  async getFileHashFromDB(dbFileName: string): Promise<string> {
    return Util.createFileHash(dbFileName);
  }

  getFileHashFromFile(fileName: string): string {
    try {
      if (existsSync(fileName)) {
        const fileHashJsonEntry = JSON.parse(readFileSync(fileName, 'utf8')).fileHash;
        if (fileHashJsonEntry) return String(fileHashJsonEntry);
      }
    } catch (e) {
      this.logger.error(`error reading file ${fileName}`, e);
    }

    return '';
  }

  saveFileHashToFile(fileName: string, fileHash: string) {
    this.logger.verbose(`saveFileHashToFile: ${fileName}`);

    writeFileSync(fileName, JSON.stringify({ fileHash }), 'utf-8');
  }
}
