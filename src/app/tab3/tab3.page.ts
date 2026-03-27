import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  NavController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { addIcons } from 'ionicons';
import { heart, heartOutline, trashOutline } from 'ionicons/icons';

import { SupabaseService } from '../services/supabase.service';
import { FavoritosEvent } from '../services/favoritos-event';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon
  ],
})
export class Tab3Page {
  chollosGuardados: any[] = [];
  cargando = true;
  private favoritosSubscription?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private favoritosEventService: FavoritosEvent,
    private router: Router,
    private navCtrl: NavController
  ) {
    addIcons({ heart, heartOutline, trashOutline });
  }

  async ionViewWillEnter() {
    console.log('Tab3 ionViewWillEnter');
    await this.cargarGuardados(true);

    // Suscribirse a cambios de favoritos
    if (!this.favoritosSubscription || this.favoritosSubscription.closed) {
      console.log('Tab3 suscribiéndose a eventos');
      this.favoritosSubscription = this.favoritosEventService.favoritosChanged$.subscribe(() => {
        console.log('Tab3 recibió evento favoritosChanged');
        // Actualización silenciosa (sin loader) para evitar microparpadeos
        this.cargarGuardados(false);
      });
    }
  }

  // Limpiar suscripción cuando se sale del tab
  ionViewWillLeave() {
    console.log('Tab3 ionViewWillLeave');
    if (this.favoritosSubscription) {
      this.favoritosSubscription.unsubscribe();
    }
  }

  async cargarGuardados(mostrarLoading: boolean = true) {
    console.log('Tab3 cargando guardados...');
    try {
      if (mostrarLoading) {
        this.cargando = true;
      }
      const data = await this.supabaseService.getChollosGuardados();

      console.log('Datos recibidos de Supabase:', data);

      // Usar un Map para eliminar duplicados por chollo_id
      const chollosUnicos = new Map();

      data.forEach((item: any) => {
        if (item.chollos && !chollosUnicos.has(item.chollos.id)) {
          chollosUnicos.set(item.chollos.id, {
            id: item.chollos.id,
            titulo: item.chollos.titulo,
            precio_actual: item.chollos.precio_actual,
            precio_original: item.chollos.precio_original,
            imagen_url: item.chollos.imagen_url,
            proveedor: item.chollos.proveedores?.nombre || 'Sin proveedor',
            guardado_id: item.id
          });
        }
      });

      // Convertir el Map a array
      this.chollosGuardados = Array.from(chollosUnicos.values());

      console.log('Chollos únicos procesados:', this.chollosGuardados);
    } catch (error) {
      console.error('Error al cargar guardados:', error);
    } finally {
      this.cargando = false;
    }
  }

  async quitarDeGuardados(chollo: any) {
    try {
      // Añadir clase de animación
      chollo.removing = true;

      // Esperar a que la animación termine (400ms según SCSS)
      await new Promise(resolve => setTimeout(resolve, 400));

      // Quitar de la lista local inmediatamente para evitar saltos o relentizaciones
      this.chollosGuardados = this.chollosGuardados.filter(c => c.id !== chollo.id);

      // Llamada a la BD de forma asíncrona sin bloquear el hilo
      this.supabaseService.eliminarCholloFavorito(chollo.id).then(() => {
        // Notificar a otros componentes que los favoritos cambiaron de forma silenciosa
        this.favoritosEventService.notificarCambio();
      }).catch(err => {
        console.error('Error al quitar DB favorito:', err);
      });

    } catch (error) {
      console.error('Error al quitar de guardados:', error);
    }
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  irAProducto(chollo: any) {
    if (!chollo.id) return;
    this.router.navigate(['/tabs', 'producto', chollo.id]);
  }

  calcDescuento(chollo: any): number {
    const actual = Number(chollo?.precio_actual || 0);
    const original = Number(chollo?.precio_original || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }

  async anadirAlCarrito(chollo: any) {
    try {
      await this.supabaseService.anadirAlCarrito(chollo.id, 1);

      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'bottom',
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
          position: 'bottom',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    }
  }
}
