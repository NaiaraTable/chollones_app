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
    //Registramos los iconos para que se vean en el HTML
    addIcons({ arrowBack, heart, heartOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.producto = await this.supabase.getCholloById(id);

      //Una vez cargado el producto, verificamos si es favorito
      if (this.producto) {
        await this.comprobarSiEsFavorito();
      }
    }
  }

  //Función para comprobar el estado inicial
  async comprobarSiEsFavorito() {
    try {
      const ids = await this.supabase.getFavoritosIds();
      this.esFavorito = ids.includes(this.producto.id);
    } catch (error) {
      console.error('Error al comprobar favorito:', error);
    }
  }

  //Función para añadir o quitar de favoritos
  async toggleFavorito() {
    try {
      if (this.esFavorito) {
        await this.supabase.eliminarCholloFavorito(this.producto.id);
        this.esFavorito = false;
      } else {
        await this.supabase.guardarCholloFavorito(this.producto.id);
        this.esFavorito = true;
      }
    } catch (error) {
      console.error('Error en toggleFavorito:', error);
    }
  }

  volverAtras() {
    this.navCtrl.back();
  }

  //función para añadir al carrito
  async anadirAlCarrito() {
    if (!this.producto) return;

    try {
      // 1. Llamada al servicio
      await this.supabase.anadirAlCarrito(this.producto.id, 1);

      // 2. Mostrar el aviso (Toast) con el estilo que creamos
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'top',
          cssClass: 'toast-carrito' // Usa la clase CSS global que ya tenemos
        });
        toast.present();
      });

    } catch (e: any) {
      console.error('Error al añadir al carrito', e);
      const msg = e && e.message ? e.message : 'Error desconocido al añadir';
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Error: ' + msg,
          duration: 3000,
          position: 'top',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    }
  }

  // --- REVIEW FUNNEL ---
  async rateProduct(score: number) {
    if (!this.producto) return;

    if (score <= 3) {
      // Negative feedback internal form
      const alert = await this.alertController.create({
        header: '¿Qué podríamos mejorar?',
        message: 'Lamentamos que tu experiencia no haya sido de 5 estrellas. Por favor, cuéntanos qué falló.',
        inputs: [
          {
            name: 'comentario',
            type: 'textarea',
            placeholder: 'Escribe tu comentario aquí...'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Enviar',
            handler: async (data) => {
              try {
                await this.supabase.enviarFeedbackNegativo(this.producto.id, score, data.comentario || '');
                // Show success toast
                import('@ionic/angular/standalone').then(async ({ ToastController }) => {
                  const toastCtrl = new ToastController();
                  const toast = await toastCtrl.create({
                    message: 'Gracias por tu feedback.',
                    duration: 2000,
                    position: 'top',
                    cssClass: 'toast-carrito'
                  });
                  toast.present();
                });
              } catch (e) {
                console.error(e);
              }
            }
          }
        ]
      });
      await alert.present();

    } else {
      // Positive feedback -> Google Maps Review
      await Browser.open({
        url: 'https://search.google.com/local/writereview?placeid=ChIJQch3bfv9cg0RqzsciQc4i4M',
        presentationStyle: 'popover'
      });
    }
  }

}
