import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonSearchbar,
  IonButtons, IonButton, IonIcon, IonSpinner, ToastController,
  IonImg // <--- IMPORTANTE: Añadido aquí
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heart, heartOutline, bagOutline, add, searchOutline,
  locationOutline, storefrontOutline, cartOutline, imageOutline
} from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { LocationService } from '../services/location.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar,
    IonSearchbar, IonButtons, IonButton, IonIcon, IonSpinner,
    IonImg // <--- IMPORTANTE: También añadido aquí
  ]
})
export class Tab4Page implements OnInit {
  listadoChollos: any[] = [];
  filtrados: any[] = [];
  categorias: any[] = [{ nombre: 'Todas', slug: 'todas' }];
  categoriaSeleccionada = 'todas';
  textoBusqueda = '';
  cargando = true;
  miLat = 37.3891;
  miLng = -5.9845;
  favoritosIds: Set<string> = new Set();

  constructor(
    private supabaseService: SupabaseService,
    private locationService: LocationService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ heart, heartOutline, bagOutline, add, searchOutline, locationOutline, storefrontOutline, cartOutline, imageOutline });
  }

  async ngOnInit() {
    await this.obtenerUbicacion();
  }

  async ionViewWillEnter() {
    await this.cargarDatos();
  }

  async obtenerUbicacion() {
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const coords = await this.locationService.getPosition();
        this.miLat = coords.latitude;
        this.miLng = coords.longitude;
      } catch (e) { console.warn('Ubicación manual'); }
    }
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      const data = await this.supabaseService.getChollos();
      const favs = await this.supabaseService.getFavoritosIds();
      this.favoritosIds = new Set(favs);

      if (data) {
        this.listadoChollos = data.map((c: any) => ({
          ...c,
          distanciaKM: c.proveedores?.lat ?
            this.locationService.calcularDistancia(this.miLat, this.miLng, c.proveedores.lat, c.proveedores.lng).toFixed(1) : '?'
        }));

        const catsMap = new Map();
        data.forEach((c: any) => {
          const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
          cats.forEach((cat: any) => {
            if (cat?.slug) catsMap.set(cat.slug, { nombre: cat.nombre, slug: cat.slug });
          });
        });
        this.categorias = [{ nombre: 'Todas', slug: 'todas' }, ...Array.from(catsMap.values())];
        this.aplicarFiltros();
      }
    } catch (e) { console.error(e); } finally { this.cargando = false; }
  }

  aplicarFiltros() {
    let tmp = [...this.listadoChollos];
    if (this.textoBusqueda) {
      tmp = tmp.filter(c => c.titulo?.toLowerCase().includes(this.textoBusqueda.toLowerCase()));
    }
    if (this.categoriaSeleccionada !== 'todas') {
      tmp = tmp.filter((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
        return cats.some((cat: any) => cat?.slug === this.categoriaSeleccionada);
      });
    }
    this.filtrados = tmp;
  }

  buscar(ev: any) {
    this.textoBusqueda = ev.detail.value || '';
    this.aplicarFiltros();
  }

  seleccionarCategoria(slug: string) {
    this.categoriaSeleccionada = slug;
    this.aplicarFiltros();
  }

  calcDescuento(c: any) {
    const actual = Number(c.precio_actual);
    const original = Number(c.precio_original);
    if (!original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }

  esFavorito(id: string) { return this.favoritosIds.has(id); }

  async toggleFavorito(c: any, e: Event) {
    e.stopPropagation();
    try {
      if (this.esFavorito(c.id)) {
        await this.supabaseService.eliminarCholloFavorito(c.id);
        this.favoritosIds.delete(c.id);
      } else {
        await this.supabaseService.guardarCholloFavorito(c.id);
        this.favoritosIds.add(c.id);
      }
    } catch (error) { console.error('Error toggle favorito', error); }
  }

  irADetalle(id: string) { this.router.navigate(['/tabs/producto', id]); }

  async anadirAlCarrito(chollo: any, e: Event) {
    e.stopPropagation();
    try {
      await this.supabaseService.anadirAlCarrito(chollo.id, 1);
      const toast = await this.toastCtrl.create({
        message: '¡Añadido al carrito!',
        duration: 1500,
        position: 'top',
        color: 'dark', // <--- COMMA AÑADIDA AQUÍ
        cssClass: 'toast-superior'
      });
      await toast.present();
    } catch (error) { console.error(error); }
  }
}
