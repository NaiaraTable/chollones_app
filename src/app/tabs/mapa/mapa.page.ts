import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { LocationService } from '../../services/location.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton]
})
export class MapaPage implements OnInit {
  map!: L.Map;
  chollos: any[] = []; // Aquí guardaremos los datos de MySQL

  private location = inject(LocationService);
  private supabase = inject(ApiService);
  private router = inject(Router);

  async ngOnInit() {
    await this.configurarIconos();

    try {
      // 1. Obtener ubicación del usuario
      const coords = await this.location.getPosition();
      this.initMap(coords.latitude, coords.longitude);
    } catch (e) {
      console.error('Error GPS, usando por defecto', e);
      this.initMap(37.3891, -5.9845); // Sevilla por defecto
    }

    // 2. Cargar chollos reales de la base de datos
    await this.obtenerChollos();
  }

  async obtenerChollos() {
    try {
      const respuesta = await this.supabase.getChollos();

      if (!respuesta) return;

      const data = (respuesta as any).data || (Array.isArray(respuesta) ? respuesta : null);

      if (data && Array.isArray(data)) {
        this.chollos = data;
        console.log('✅ Chollos cargados:', this.chollos.length);
        
        // 🐛 DEBUG: Mostrar cuáles tienen coordenadas
        const conCoordenadas = this.chollos.filter(c => {
          const lat = c.lat ?? c.proveedores?.lat;
          const lng = c.lng ?? c.proveedores?.lng;
          return lat && lng;
        });
        console.warn('🗺️ Chollos CON coordenadas:', conCoordenadas.length, 'de', this.chollos.length);
        
        // 🐛 DEBUG: Mostrar los que NO tienen
        const sinCoordenadas = this.chollos.filter(c => {
          const lat = c.lat ?? c.proveedores?.lat;
          const lng = c.lng ?? c.proveedores?.lng;
          return !lat || !lng;
        });
        console.error('❌ Chollos SIN coordenadas:', sinCoordenadas.length);
        sinCoordenadas.slice(0, 3).forEach((c: any) => {
          console.log(`  - ${c.titulo}: proveedor=${c.proveedores?.nombre}, lat=${c.proveedores?.lat}, lng=${c.proveedores?.lng}`);
        });
        
        this.pintarMarcadores();
      }
    } catch (e) {
      console.error('Error al cargar los chollos en el mapa:', e);
    }
  }

  pintarMarcadores() {
    // Coordenadas por defecto (Sevilla)
    const DEFAULT_LAT = 37.3891;
    const DEFAULT_LNG = -5.9845;

    // Agrupar chollos por coordenadas para detectar duplicados
    const coordMap = new Map<string, any[]>();

    this.chollos.forEach(chollo => {
      // Intentar obtener coordenadas
      let latitud = chollo.lat ?? chollo.proveedores?.lat;
      let longitud = chollo.lng ?? chollo.proveedores?.lng;

      // Si no hay coordenadas, usar fallback con aviso
      const tieneUbicacion = latitud && longitud;
      if (!tieneUbicacion) {
        latitud = DEFAULT_LAT;
        longitud = DEFAULT_LNG;
      }

      // Agrupar por coordenadas
      const key = `${latitud},${longitud}`;
      if (!coordMap.has(key)) {
        coordMap.set(key, []);
      }
      coordMap.get(key)?.push({ ...chollo, latitud, longitud, tieneUbicacion });
    });

    // Pintar marcadores con offset si hay múltiples en la misma ubicación
    coordMap.forEach((chollos, coordKey) => {
      const total = chollos.length;

      chollos.forEach((chollo, index) => {
        let lat = chollo.latitud;
        let lng = chollo.longitud;

        // Si hay múltiples chollos en la misma ubicación, agregar offset
        if (total > 1) {
          // Distribuir en círculo pequeño (radio ≈ 0.0005 grados ≈ 50 metros)
          const angle = (index / total) * (2 * Math.PI);
          const offsetRadius = 0.0005;
          lat = parseFloat(lat) + offsetRadius * Math.cos(angle);
          lng = parseFloat(lng) + offsetRadius * Math.sin(angle);
        }

        const nombreProveedor = chollo.proveedores?.nombre || 'Proveedor desconocido';
        const precio = chollo.precio_actual || chollo.precio || 0;

        // Creamos el contenedor del popup
        const popupContent = document.createElement('div');
        popupContent.style.textAlign = 'center';

        const avisoUbicacion = chollo.tieneUbicacion ? '' : '<br><span style="color: orange; font-size: 11px;">⚠️ Ubicación aproximada</span>';
        const avisoColisión = total > 1 ? `<br><span style="color: #666; font-size: 11px;">📍 ${index + 1} de ${total} ofertas</span>` : '';

        popupContent.innerHTML = `
          <div class="map-popup-container">
            <b class="popup-title">${chollo.titulo}</b>
            <br>
            <span class="popup-vendor">${nombreProveedor}</span>
            <br>
            <b class="popup-price">${precio}€</b>
            ${avisoUbicacion}
            ${avisoColisión}
            <br>
            <button class="popup-btn" style="margin-top: 5px;">Ver Oferta</button>
          </div>
        `;

        const btn = popupContent.querySelector('.popup-btn');
        btn?.addEventListener('click', () => {
          this.irADetalle(chollo.id);
        });

        const marker = L.marker([lat, lng], {
          title: chollo.titulo
        })
          .addTo(this.map)
          .bindPopup(popupContent);
      });
    });

    // Log para debugging
    const duplicados = Array.from(coordMap.entries()).filter(([_, arr]) => arr.length > 1);
    if (duplicados.length > 0) {
      console.log(`🎯 Ubicaciones con múltiples chollos (${duplicados.length}):`);
      duplicados.forEach(([coord, arr]) => {
        console.log(`  ${coord}: ${arr.length} ofertas`);
      });
    }
  }

  private initMap(lat: number, lng: number) {
    const mapOptions: any = {
      tap: false,
      wheelDebounceTime: 150
    };

    this.map = L.map('map', mapOptions).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    L.marker([lat, lng]).addTo(this.map).bindPopup('Tú estás aquí').openPopup();

    // Forzamos un re-cálculo del tamaño para que no se vea el mapa gris
    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);
  }

  private configurarIconos() {
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  irADetalle(id: string) {
    this.router.navigate(['/tabs/producto', id]);
  }
}