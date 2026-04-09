import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NavController, AlertController } from '@ionic/angular/standalone';
import { arrowBack, heart, heartOutline, star, starOutline, createOutline, trashOutline, chatbubbleOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Browser } from '@capacitor/browser';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProductosPage implements OnInit {
  producto: any;
  esFavorito: boolean = false;
  haComprado: boolean = false;

  // --- Reviews ---
  reviews: any[] = [];
  miReview: any = null;
  cargandoReviews: boolean = false;

  // Formulario nueva reseña
  mostrarFormulario: boolean = false;
  editandoReview: boolean = false;
  nuevaReviewPuntuacion: number = 0;
  nuevaReviewComentario: string = '';
  enviandoReview: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
    private apiService: ApiService,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {
    addIcons({ arrowBack, heart, heartOutline, star, starOutline, createOutline, trashOutline, chatbubbleOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const data = await this.supabase.getCholloById(id);
      if (data) {
        this.producto = data;
        this.producto.descripcion_limpia = this.limpiarHtml(data.descripcion || '');
        this.producto.extracto_limpio = this.limpiarHtml(data.extracto || '');

        await Promise.all([
          this.comprobarSiEsFavorito(),
          this.cargarReviews(),
          this.comprobarSiHaComprado()
        ]);
      }
    }
  }

  limpiarHtml(html: string): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // -------------------------------------------------------
  //  REVIEWS
  // -------------------------------------------------------

  async cargarReviews() {
    if (!this.producto?.id) return;
    this.cargandoReviews = true;
    try {
      const data = await this.apiService.request(`reviews.php?action=list&product_id=${this.producto.id}`);
      this.reviews = Array.isArray(data) ? data : [];
      // Separar mi reseña del resto
      this.miReview = this.reviews.find(r => r.es_mia) || null;
    } catch (e) {
      console.error('Error al cargar reviews:', e);
      this.reviews = [];
    } finally {
      this.cargandoReviews = false;
    }
  }

  get otrasReviews(): any[] {
    return this.reviews.filter(r => !r.es_mia);
  }

  mediaReviews(): number {
    if (!this.reviews.length) return 0;
    const suma = this.reviews.reduce((acc, r) => acc + (r.puntuacion || 0), 0);
    return suma / this.reviews.length;
  }

  abrirFormulario() {
    const token = localStorage.getItem('chollones_token');
    if (!token) {
      this.mostrarAlertaLogin();
      return;
    }
    this.editandoReview = false;
    this.nuevaReviewPuntuacion = 0;
    this.nuevaReviewComentario = '';
    this.mostrarFormulario = true;
  }

  abrirEdicion() {
    if (!this.miReview) return;
    this.editandoReview = true;
    this.nuevaReviewPuntuacion = this.miReview.puntuacion || 0;
    this.nuevaReviewComentario = this.miReview.comentario || '';
    this.mostrarFormulario = true;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.editandoReview = false;
    this.nuevaReviewPuntuacion = 0;
    this.nuevaReviewComentario = '';
  }

  async enviarReview() {
    if (this.nuevaReviewPuntuacion === 0) {
      const alert = await this.alertController.create({
        header: 'Puntuación requerida',
        message: 'Por favor selecciona una puntuación de 1 a 5 estrellas.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (!this.nuevaReviewComentario.trim()) {
      const alert = await this.alertController.create({
        header: 'Comentario requerido',
        message: 'Por favor escribe un comentario para tu reseña.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.enviandoReview = true;
    try {
      if (this.editandoReview && this.miReview) {
        // Enviar edición
        const actualizada = await this.apiService.request('reviews.php?action=update', {
          method: 'POST',
          body: JSON.stringify({
            review_id: this.miReview.id,
            puntuacion: this.nuevaReviewPuntuacion,
            comentario: this.nuevaReviewComentario.trim()
          })
        });

        // Actualizar en el array
        this.miReview.puntuacion = actualizada.puntuacion;
        this.miReview.comentario = actualizada.comentario;
        const index = this.reviews.findIndex(r => r.id === this.miReview.id);
        if (index > -1) {
          this.reviews[index] = this.miReview;
        }
      } else {
        // Enviar nueva reseña
        const nueva = await this.apiService.request('reviews.php?action=add', {
          method: 'POST',
          body: JSON.stringify({
            product_id: this.producto.id,
            puntuacion: this.nuevaReviewPuntuacion,
            comentario: this.nuevaReviewComentario.trim()
          })
        });

        // Añadir al array y marcar como "mía"
        nueva.es_mia = true;
        this.reviews = [nueva, ...this.reviews];
        this.miReview = nueva;
      }

      this.cerrarFormulario();

    } catch (e: any) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: e.message || 'No se pudo publicar la reseña.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.enviandoReview = false;
    }
  }

  async eliminarMiReview() {
    if (!this.miReview) return;

    const confirm = await this.alertController.create({
      header: '¿Eliminar reseña?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.apiService.request('reviews.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({ review_id: this.miReview.id })
              });
              // Actualizar estado local
              this.reviews = this.reviews.filter(r => r.id !== this.miReview!.id);
              this.miReview = null;
            } catch (e: any) {
              const alert = await this.alertController.create({
                header: 'Error',
                message: e.message || 'No se pudo eliminar la reseña.',
                buttons: ['OK']
              });
              await alert.present();
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // -------------------------------------------------------
  //  RESTO DE LÓGICA ORIGINAL
  // -------------------------------------------------------

  async comprobarSiHaComprado() {
    if (!this.producto?.id) return;
    const token = localStorage.getItem('chollones_token');
    if (!token) {
      this.haComprado = false;
      return;
    }

    try {
      const res = await this.apiService.request(`reviews.php?action=can_review&product_id=${this.producto.id}`);
      this.haComprado = res.can_review;
    } catch (e) {
      console.error('Error al verificar compras:', e);
      this.haComprado = false;
    }
  }

  async comprobarSiEsFavorito() {
    try {
      const ids = await this.supabase.getFavoritosIds();
      this.esFavorito = ids.includes(this.producto.id);
    } catch (error) { console.error('Error:', error); }
  }

  async toggleFavorito() {
    const token = localStorage.getItem('chollones_token');
    if (!token) {
      await this.mostrarAlertaLogin();
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

  private async mostrarAlertaLogin() {
    const alert = await this.alertController.create({
      header: '¡Atención!',
      message: 'Debes iniciar sesión para realizar esta acción.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Iniciar Sesión', handler: () => { this.navCtrl.navigateForward('/tabs/tab5'); } }
      ]
    });
    await alert.present();
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

  mostrarTodo: boolean = false;

  toggleDescripcion() {
    this.mostrarTodo = !this.mostrarTodo;
  }
}
