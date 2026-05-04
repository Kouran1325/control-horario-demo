import { Injectable } from '@angular/core';

export interface CoordinatesDto {
  lat: number;
  lng: number;
  accuracy: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  getCurrentPosition(): Promise<CoordinatesDto> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La geolocalización no está disponible en este navegador.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Has denegado el permiso de ubicación.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('La ubicación no está disponible.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Se agotó el tiempo para obtener la ubicación.'));
              break;
            default:
              reject(new Error('No se pudo obtener la ubicación.'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }
}