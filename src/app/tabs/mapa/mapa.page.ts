import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { LocationService } from '../../services/location.service';
import { ApiService } from '../../services/api.service'; // Importamos el servicio de la API
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
  // Datos y control para el panel de depuración (opcional en la UI)
  debugList: any[] = [];
  // Mostrar el panel de depuración por defecto para comprobar rápidamente
  showDebug = true;
  // Mensajes de estado visibles en la UI para depuración cuando la consola no se ve
  statusMessages: string[] = [];

  private pushStatus(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.statusMessages.unshift(`[${time}] ${msg}`);
    // mantenemos sólo los últimos 50 mensajes
    if (this.statusMessages.length > 50) this.statusMessages.pop();
  }

  // Usamos `inject()` para cumplir la regla del linter (@angular-eslint/prefer-inject)
  private location = inject(LocationService);
  private supabase = inject(ApiService); // Inyectamos ApiService
  private router = inject(Router);

  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  async ngOnInit() {
    console.log('MapaPage ngOnInit start');
    this.pushStatus('ngOnInit start');
    await this.configurarIconos(); // Arregla los errores 404 de los iconos

    try {
      // 1. Obtener ubicación del usuario
      const coords = await this.location.getPosition();
      this.initMap(coords.latitude, coords.longitude);
      this.pushStatus(`initMap called with coords ${coords.latitude}, ${coords.longitude}`);
    } catch (e) {
      console.error('Error GPS, usando por defecto', e);
      this.initMap(37.3891, -5.9845); // Sevilla por defecto
      this.pushStatus('initMap called with default coords (Sevilla)');
    }

    // 2. Cargar chollos reales de la base de datos
    await this.obtenerChollos();
  }

  async obtenerChollos() {
    try {
      console.log('obtenerChollos: llamando a getChollos()');
      // 1. Obtenemos la respuesta completa sin desestructurar {}
      const respuesta = await this.supabase.getChollos();
      console.log('obtenerChollos: respuesta raw:', respuesta);
      this.pushStatus('obtenerChollos: respuesta recibida');

      // 2. Si la respuesta es nula o indefinida, abortamos
      if (!respuesta) {
        console.warn('No se recibió respuesta de la API en el mapa');
        return;
      }

      // 3. Extraemos los datos de forma segura
      // Esto evita el error "Cannot destructure property data"
      const data = (respuesta as any).data || (Array.isArray(respuesta) ? respuesta : null);
      console.log('obtenerChollos: data interpretada:', Array.isArray(data) ? `array(${data.length})` : data);
      this.pushStatus(Array.isArray(data) ? `data interpretada: array(${data.length})` : `data interpretada: ${JSON.stringify(data)}`);

      if (data && Array.isArray(data)) {
        this.chollos = data;
        // Log para confirmar que vamos a pintar marcadores
        console.log('obtenerChollos: chollos cargados, total=', this.chollos.length);
        this.pushStatus(`chollos cargados: ${this.chollos.length}`);
        this.pintarMarcadores();
      } else {
        console.warn('obtenerChollos: no hay datos válidos para pintar');
      }
    } catch (e) {
      console.error('Error final en mapa:', e);
    }
  }

  pintarMarcadores() {
    // Limpiamos array de depuración antes de repoblar
    this.debugList = [];

    this.chollos.forEach(chollo => {
      // Sacamos lat y lng del proveedor (puede venir como string o number) — soportamos varias claves posibles
      const prov = chollo.proveedores || {};
      const latRaw = prov.dokan_geo_latitude ?? prov.dokan_latitude ?? prov.lat ?? prov.latitude ?? prov.latitud ?? prov.latitud_geo;
      const lngRaw = prov.dokan_geo_longitude ?? prov.dokan_longitude ?? prov.lng ?? prov.longitude ?? prov.longitud ?? prov.longitud_geo;
      const latitud = latRaw;
      const longitud = lngRaw;

      // Construimos un resumen más seguro
      const nombreProveedor = chollo.proveedores?.nombre || 'Proveedor desconocido';
      const precio = chollo.precio_actual || chollo.precio || 0;

      // Registro detallado en la consola para depuración (grupo abierto de forma predeterminada)
      console.group(`Chollo: ${chollo.id || chollo.titulo}`);
      console.log('Proveedor (raw):', chollo.proveedores);
      console.log('Latitud:', latitud);
      console.log('Longitud:', longitud);
      console.log('Precio:', precio);
      // Añadimos una pequeña tabla con los campos de interés
      console.table([{ id: chollo.id, titulo: chollo.titulo, proveedor: nombreProveedor, lat: latitud, lng: longitud, precio }]);
      console.groupEnd();
      this.pushStatus(`pintarMarcadores: procesando chollo ${chollo.id || chollo.titulo}`);

      // Guardamos datos en el debugList para mostrar en la UI si se desea
      this.debugList.push({ id: chollo.id, titulo: chollo.titulo, proveedor: nombreProveedor, lat: latitud, lng: longitud, precio });

      if (latitud && longitud) {
        // Creamos el contenedor del popup como un elemento HTML real
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

    // Forzamos un re-cálculo del tamaño para que no se vea el mapa gris o bloqueado
    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);
  }

  private configurarIconos() {
    // Fix para que los iconos de Leaflet no den error 404
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
    console.log('Navegando al chollo desde el mapa:', id);
    this.router.navigate(['/tabs/producto', id]);
  }
}
