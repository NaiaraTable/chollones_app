import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavController, AlertController } from '@ionic/angular/standalone';
import { arrowBack, heart, heartOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ProductosPage implements OnInit {
  producto: any;
  esFavorito: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {
    addIcons({ arrowBack, heart, heartOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const data = await this.supabase.getCholloById(id);
      if (data) {
        this.producto = data;
        // Limpiamos los campos que vienen con HTML sucio
        this.producto.descripcion_limpia = this.limpiarHtml(data.descripcion || '');
        this.producto.extracto_limpio = this.limpiarHtml(data.extracto || '');

        await this.comprobarSiEsFavorito();
      }
    }
  }

  // Función para quitar etiquetas HTML basura y dejar solo texto
  limpiarHtml(html: string): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  async comprobarSiEsFavorito() {
    try {
      const ids = await this.supabase.getFavoritosIds();
      this.esFavorito = ids.includes(this.producto.id);
    } catch (error) { console.error('Error:', error); }
  }

  async toggleFavorito() {
    // CORREGIDO: Usamos la clave correcta 'chollones_token'
    const token = localStorage.getItem('chollones_token');

    if (!token) {
      const alert = await this.alertController.create({
        header: '¡Atención!',
        message: 'Debes iniciar sesión para poder guardar chollos en tus favoritos.',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Iniciar Sesión',
            handler: () => {
              // Asegúrate de usar navCtrl si es lo que tienes inyectado en este archivo
              this.navCtrl.navigateForward('/tabs/tab5');
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    try {
      if (this.esFavorito) {
        await this.supabase.eliminarCholloFavorito(this.producto.id);
        this.esFavorito = false;
      } else {
        await this.supabase.guardarCholloFavorito(this.producto.id);
        this.esFavorito = true;
      }
    } catch (error) {
      console.error('Error al guardar favorito:', error);
    }
  }

  volverAtras() { this.navCtrl.back(); }

  async anadirAlCarrito() {
    if (!this.producto) return;
    try {
      await this.supabase.anadirAlCarrito(this.producto.id, 1);
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toast = await new ToastController().create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'bottom',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    } catch (e: any) { console.error('Error:', e); }
  }

  async rateProduct(score: number) {
    if (!this.producto) return;
    if (score <= 3) {
      const alert = await this.alertController.create({
        header: '¿Qué podríamos mejorar?',
        inputs: [{ name: 'comentario', type: 'textarea', placeholder: 'Escribe tu comentario...' }],
        buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Enviar', handler: async (data) => { await this.supabase.enviarFeedbackNegativo(this.producto.id, score, data.comentario || ''); } }]
      });
      await alert.present();
    } else {
      await Browser.open({ url: 'https://search.google.com/local/writereview?placeid=ChIJQch3bfv9cg0RqzsciQc4i4M', presentationStyle: 'popover' });
    }
  }
}
