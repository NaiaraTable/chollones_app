import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameBaseComponent } from '../components/game-base/game-base.component';

import {
  IonHeader, IonToolbar, IonButtons, IonIcon,
  IonTabs, IonTabBar, IonTabButton, IonLabel,
  IonSearchbar, IonButton, IonModal, IonContent,
  IonFab, IonFabButton
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  heartOutline, personOutline, bagOutline,
  flameOutline, gridOutline, notificationsOutline,
  locationOutline, clipboardOutline, close,
  searchOutline, storefrontOutline
} from 'ionicons/icons';

import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { SearchService } from '../services/Search.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonButtons, IonIcon,
    IonSearchbar, IonTabs, IonTabBar, IonTabButton,
    IonLabel, IonButton, IonModal, IonContent,
    IonFab, IonFabButton,
    GameBaseComponent
  ]
})
export class TabsPage {
  private cdr = inject(ChangeDetectorRef);

  modalJuegosAbierto = false;
  textoBusqueda = '';
  sugerencias: any[] = [];
  mostrarSugerencias = false;
  private todosLosChollos: any[] = [];
  private busquedaTimeout: any;

  constructor(
    public router: Router,
    private apiService: ApiService,
    private searchService: SearchService
  ) {
    addIcons({
      heartOutline, personOutline, bagOutline,
      flameOutline, gridOutline, notificationsOutline,
      locationOutline, clipboardOutline, close,
      searchOutline, storefrontOutline
    });
    this.precargarChollos();
  }

  private async precargarChollos() {
    try {
      this.todosLosChollos = await this.apiService.getChollos();
    } catch (e) {
      console.error('Error precargando chollos:', e);
    }
  }

  onBuscar(event: any) {
    const texto = (event.target?.value ?? '').trim();
    this.textoBusqueda = texto;

    clearTimeout(this.busquedaTimeout);

    if (texto.length < 2) {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
      return;
    }

    this.busquedaTimeout = setTimeout(() => {
      this.generarSugerencias(texto);
    }, 250);
  }

  private generarSugerencias(texto: string) {
    const q = texto.toLowerCase();
    const resultados: any[] = [];

    for (const c of this.todosLosChollos) {
      if (resultados.length >= 6) break;
      if ((c.titulo || '').toLowerCase().includes(q)) {
        resultados.push({
          id:        c.id,
          titulo:    c.titulo,
          proveedor: c.proveedores?.nombre || '',
          imagen:    c.imagen_url,
          precio:    c.precio_actual
        });
      }
    }

    this.sugerencias = resultados;
    this.mostrarSugerencias = resultados.length > 0;
    this.cdr.detectChanges();
  }

  seleccionarSugerencia(sugerencia: any) {
    this.mostrarSugerencias = false;
    const texto = sugerencia.esProveedor ? sugerencia.proveedor : sugerencia.titulo;
    this.textoBusqueda = texto;
    this.buscarTexto(texto);
  }

  buscarTexto(texto: string) {
    if (!texto.trim()) return;
    this.mostrarSugerencias = false;

    // Emite la búsqueda al servicio reactivo
    this.searchService.setBusqueda(texto.trim());

    // Navega a tab4 si no estamos ya ahí
    if (!this.router.url.includes('/tabs/tab4')) {
      this.router.navigate(['/tabs/tab4']);
    }
  }

  onEnter(event: any) {
    const texto = (event.target?.value || this.textoBusqueda).trim();
    this.buscarTexto(texto);
  }

  onLimpiarBusqueda() {
    this.textoBusqueda = '';
    this.sugerencias = [];
    this.mostrarSugerencias = false;
    this.searchService.setBusqueda('');
  }

  cerrarSugerencias() {
    // Pequeño delay para que el mousedown de la sugerencia se procese antes
    setTimeout(() => {
      this.mostrarSugerencias = false;
      this.cdr.detectChanges();
    }, 150);
  }

  navegar(ruta: string) { this.router.navigate([ruta]); }

  abrirJuegos() {
    this.modalJuegosAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarJuegos() {
    this.modalJuegosAbierto = false;
    this.cdr.detectChanges();
  }
}
