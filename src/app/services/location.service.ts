import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({ providedIn: 'root' })
export class LocationService {

  constructor() {}

async getPosition() {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false, // Carga más rápido (usa WiFi/Antenas) y falla menos
      timeout: 5000,            // Máximo 5 segundos de espera
      maximumAge: 30000         // Acepta una posición guardada hace 30 segundos
    });
    return coordinates.coords;
  } catch (e) {
    console.warn("GPS falló, usando fallback");
    throw e; // Lanzamos el error para que el componente use las coordenadas por defecto
  }
}

  // La fórmula ahora vive aquí para que todos la usen
  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async iniciarVigilancia(chollos: any[]) {
    await Geolocation.watchPosition({
      enableHighAccuracy: true
    }, (position, err) => {
      if (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        chollos.forEach(chollo => {
          if (chollo.lat && chollo.lng) {
            // Ahora 'this' ya reconoce la función porque está en la misma clase
            const d = this.calcularDistancia(lat, lng, chollo.lat, chollo.lng);
            
            if (d < 0.2) {
              console.log(`¡ESTÁS CERCA DE UN CHOLLO!: ${chollo.titulo}`);
            }
          }
        });
      }
    });
  }
}