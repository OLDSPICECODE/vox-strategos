import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Este mensaje aparecerá cuando entres a la URL de tu API en el navegador
    return `
      🚀 Vox Strategos Backend is Online!
      ----------------------------------
      Environment: ${nodeEnv.toUpperCase()}
      Status: Running on Docker
      Time: ${new Date().toISOString()}
    `;
  }
}