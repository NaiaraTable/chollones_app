import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {arrowBack, cartOutline, chatbubbleOutline, heart, heartOutline, star, starOutline} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ProductosPage implements OnInit {
  producto: any;
  esFavorito: boolean = false;
  comentarios: any[] = [];
// Lógica de Reviews
  mostrarFormulario: boolean = false;
  nuevaResena = { rating: 5, comentario: '' };
  promedioEstrellas: number = 0;

  // Usar inject() en lugar de inyección por constructor (sigue la regla de ESLint indicada)
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  constructor() {
    // Mantengo la inicialización de iconos aquí
    addIcons({ arrowBack, heart, heartOutline, star, starOutline, cartOutline, chatbubbleOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.producto = await this.apiService.getCholloById(id);
      if (this.producto) {
        await this.comprobarSiEsFavorito();
        await this.cargarComentarios(id);
      }
    }
  }

  async cargarComentarios(id: string) {
    this.comentarios = await this.apiService.getComentariosByProducto(id);
    this.calcularPromedio();
  }

  calcularPromedio() {
    if (this.comentarios.length > 0) {
      const suma = this.comentarios.reduce((acc, c) => acc + (Number(c.rating) || 0), 0);
      this.promedioEstrellas = parseFloat((suma / this.comentarios.length).toFixed(1));
    }
  }

  setRating(valor: number) {
    this.nuevaResena.rating = valor;
  }

  async enviarResena() {
    if (!this.nuevaResena.comentario.trim()) return;

    try {
      // Asumiendo que crearás este método en tu ApiService
      // await this.apiService.postComentario(this.producto.id, this.nuevaResena);

      this.mostrarFormulario = false;
      this.nuevaResena = { rating: 5, comentario: '' };
      await this.cargarComentarios(this.producto.id); // Recargar lista
    } catch (e) {
      console.error("Error al enviar reseña", e);
    }
  }

  // Comprueba si el producto actual está en favoritos
  async comprobarSiEsFavorito() {
    if (!this.producto) {
      this.esFavorito = false;
      return;
    }

    try {
      const idsResp: any = await this.apiService.getFavoritosIds();
      let idList: string[] = [];

      if (Array.isArray(idsResp)) {
        idList = idsResp.map((i: any) => {
          if (typeof i === 'string') return i;
          // Manejar posibles formas: { id: 'x' } o { chollo_id: 'x' }
          return i.id ?? i.chollo_id ?? i.cholloId ?? i;
        });
      }

      this.esFavorito = idList.includes(this.producto.id);
    } catch (e) {
      console.error('Error comprobando favorito:', e);
      this.esFavorito = false;
    }
  }

  async anadirAlCarrito() {
    if (!this.producto) return;
    try {
      // Usar ApiService (antes se referenciaba a `supabase` que no existe en este componente)
      await this.apiService.anadirAlCarrito(this.producto.id, 1);
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
}
