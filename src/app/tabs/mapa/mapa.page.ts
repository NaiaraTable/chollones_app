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
        this.pintarMarcadores();
      }
    } catch (e) {
      console.error('Error al cargar los chollos en el mapa:', e);
    }
  }

  pintarMarcadores() {
    this.chollos.forEach(chollo => {
      // Usamos las variables limpias que vienen directas del PHP
      const latitud = chollo.lat ?? chollo.proveedores?.lat;
      const longitud = chollo.lng ?? chollo.proveedores?.lng;

      const nombreProveedor = chollo.proveedores?.nombre || 'Proveedor desconocido';
      const precio = chollo.precio_actual || chollo.precio || 0;

      if (latitud && longitud) {
        // Creamos el contenedor del popup
        const popupContent = document.createElement('div');
        popupContent.style.textAlign = 'center';

        popupContent.innerHTML = `
          <div class="map-popup-container">
            <b class="popup-title">${chollo.titulo}</b>
            <br>
            <span class="popup-vendor">${nombreProveedor}</span>
            <br>
            <b class="popup-price">${precio}€</b>
            <br>
            <button class="popup-btn" style="margin-top: 5px;">Ver Oferta</button>
          </div>
        `;

        const btn = popupContent.querySelector('.popup-btn');
        btn?.addEventListener('click', () => {
          this.irADetalle(chollo.id);
        });

        L.marker([parseFloat(String(latitud)), parseFloat(String(longitud))])
          .addTo(this.map)
          .bindPopup(popupContent);
      }
    });
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