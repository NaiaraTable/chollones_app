import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  searchOutline,
  heartOutline,
  heart,
  personOutline,
  bagOutline,
  flameOutline,
  timeOutline,
  openOutline
} from 'ionicons/icons';

import { SupabaseService } from '../services/supabase.service';
import { FavoritosEvent } from '../services/favoritos-event';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ],
})
export class Tab1Page implements OnInit {
  // Propiedades básicas para la interfaz
  cartCount = 0;
  bannerUrl = 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=1400&auto=format&fit=crop';

  // Listados de datos requeridos por el HTML (Corrige errores Imágenes 5 y 7)
  quickLinks = [
    { id: 'recientes', title: 'Recientes', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop', bgColor: '#fff4cc' },
    { id: 'destacados', title: 'Destacados', img: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=600&auto=format&fit=crop', bgColor: '#e2e2e2' },
    { id: 'valorados', title: 'Mejor valorados', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop', bgColor: '#ffe2e6' },
    { id: 'descuento', title: 'Mejores descuentos', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop', bgColor: '#e6f0fa' }
  ];

  productosPopulares: any[] = [];
  chollosFiltrados: any[] = [];
  categorias = [
    { nombre: 'Belleza y Bienestar', slug: 'belleza-bienestar', img: 'assets/img-categorias/belleza-bienestar.png' },
    { nombre: 'Moda', slug: 'moda', img: 'assets/img-categorias/moda.png' },
    { nombre: 'Mascotas', slug: 'mascotas', img: 'assets/img-categorias/mascotas.png' },
    { nombre: 'Cocina', slug: 'cocina', img: 'assets/img-categorias/cocina.png' },
    { nombre: 'Marketing', slug: 'marketing', img: 'assets/img-categorias/marketing.png' },
    { nombre: 'Juguetes', slug: 'juguetes', img: 'assets/img-categorias/juguetes.png' },
    { nombre: 'Electrónica', slug: 'electronica', img: 'assets/img-categorias/electronica.png' },
    { nombre: 'Servicios Estéticos', slug: 'servicios-esteticos', img: 'assets/img-categorias/servicios-esteticos.png' },
  ];

  // Set para trackear IDs de favoritos
  favoritosIds: Set<string> = new Set();

  constructor(
    private supabaseService: SupabaseService,
    private favoritosEvent: FavoritosEvent,
    public router: Router
  ) {
    addIcons({
      searchOutline, heartOutline, heart, personOutline, bagOutline,
      flameOutline, timeOutline, openOutline
    });
  }

  async ngOnInit() {
    await this.cargarDatos();
    await this.cargarFavoritos();
  }

  // Recargar favoritos cuando vuelves a este tab
  async ionViewWillEnter() {
    await this.cargarFavoritos();
  }

  async cargarDatos() {
    try {
      const res = await this.supabaseService.getChollos();

      // Validamos que res no sea nulo y que sea un array (o contenga data como array)
      const dataRaw = Array.isArray(res) ? res : (res as any)?.data;

      if (dataRaw && Array.isArray(dataRaw)) {
        const dataMapeada = dataRaw.map((c: any) => ({
          ...c,
          titulo: c.titulo,
          precioActual: c.precio_actual,
          precioOriginal: c.precio_original,
          imagen: c.imagen_url,
          proveedor: c.proveedores?.nombre,
          nuevo: this.esReciente(c.created_at)
        }));

        this.productosPopulares = dataMapeada;
        this.chollosFiltrados = [...dataMapeada];
      } else {
        console.warn('No se pudieron cargar los datos o el formato es incorrecto');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  async cargarFavoritos() {
    try {
      const ids = await this.supabaseService.getFavoritosIds();
      this.favoritosIds = new Set(ids);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    }
  }

  // Función de búsqueda (Corrige error Imagen 6)
  onSearch(ev: any) {
    const q = (ev?.target?.value || '').toLowerCase().trim();

    if (!q) {
      this.chollosFiltrados = [...this.productosPopulares];
      return;
    }

    this.chollosFiltrados = this.productosPopulares.filter((p) => {
      return (p.titulo || '').toLowerCase().includes(q) ||
        (p.proveedor || '').toLowerCase().includes(q);
    });
  }

  // Navegar a la pestaña de guardados
  irAGuardados() {
    this.router.navigate(['/tabs/tab3']);
  }

  // Navegar a una categoría
  irACategoria(slug: string) {
    this.router.navigate(['/tabs', 'categoria', slug]);
  }

  // Métodos para gestión de favoritos
  async toggleFavorito(chollo: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const id = chollo.id;
    const isFav = this.isFavorito(id);

    // Optimistic UI update
    if (isFav) {
      this.favoritosIds.delete(id);
    } else {
      this.favoritosIds.add(id);
    }

    try {
      if (isFav) {
        await this.supabaseService.eliminarCholloFavorito(id);
      } else {
        await this.supabaseService.guardarCholloFavorito(id);
      }

      // Notificar a otros componentes
      this.favoritosEvent.notificarCambio();
    } catch (error) {
      console.error('Error al gestionar favorito (revertiendo):', error);
      // Revertir cambio si falla
      if (isFav) {
        this.favoritosIds.add(id);
      } else {
        this.favoritosIds.delete(id);
      }
    }
  }

  isFavorito(cholloId: string): boolean {
    return this.favoritosIds.has(cholloId);
  }

  // Utilidades requeridas por el HTML
  esReciente(fecha: string): boolean {
    if (!fecha) return false;
    const horas = (new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60);
    return horas < 24;
  }

  // Ajustado para recibir el objeto chollo completo (Corrige error Imagen 7)
  calcDescuento(c: any): number {
    const actual = Number(c?.precio_actual || 0);
    const original = Number(c?.precio_original || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }
  // ✅ Abrir página de producto (detalle)
  irAProducto(chollo: any) {
    const id = chollo?.id;
    if (!id) return;

    this.router.navigate(['/tabs', 'producto', id]);
  }

  // ✅ Lógica real del carrito
  async anadirAlCarrito(item: any) {
    try {
      await this.supabaseService.anadirAlCarrito(item.id, 1);

      // Mostrar feedback visual
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'top',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });

    } catch (e) {
      console.error('Error al añadir al carrito', e);
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Error al añadir. ¿Iniciaste sesión?',
          duration: 3000,
          position: 'top',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    }
  }

  // ✅ Si quieres descuento también en "productosPopulares"
  calcDescuentoPopular(p: any): number {
    const actual = Number(p?.precioActual || 0);
    const original = Number(p?.precioOriginal || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }


}
