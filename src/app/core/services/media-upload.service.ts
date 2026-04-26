import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PresignUploadResponse } from '../models/upload.model';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

/**
 * Resuelve el flujo de carga de imágenes usando URLs firmadas.
 */
@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly http = inject(HttpClient);

  /**
   * Solicita una URL firmada y carga una imagen al bucket correspondiente.
   * @param file Archivo de imagen seleccionado por el usuario.
   * @param folder Carpeta lógica donde se almacenará el recurso.
   */
  async uploadImage(file: File, folder: 'products' | 'categories'): Promise<string> {
    const presign = await firstValueFrom(this.requestUpload(file, folder));

    if (!presign?.uploadUrl || !presign.fileUrl) {
      throw new Error('No se recibio URL de carga');
    }

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('No se pudo cargar el archivo');
    }

    return presign.fileUrl;
  }

  /**
   * Pide al backend la información necesaria para subir un archivo a S3.
   * @param file Archivo que se desea cargar.
   * @param folder Carpeta lógica usada por backend para construir la ruta.
   */
  private requestUpload(file: File, folder: 'products' | 'categories') {
    return this.http.post<PresignUploadResponse>(`${API_BASE_URL}/uploads/presign`, {
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      folder,
    });
  }
}
