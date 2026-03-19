import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonFooter, IonSpinner, IonButtons, IonBackButton, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline, bagCheckOutline, bagOutline } from 'ionicons/icons';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonFooter, IonSpinner, IonButtons, IonBackButton
  ]
})
export class CarritoPage implements OnInit {
  articulos: any[] = [];
  cargando = true;
  total = 0;
  procesandoPago = false;

  constructor(
    private supabaseService: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ addOutline, removeOutline, trashOutline, bagCheckOutline, bagOutline });
  }

  async ngOnInit() {
    await this.cargarCarrito();
  }

  async ionViewWillEnter() {
    await this.cargarCarrito();
  }

  async cargarCarrito() {
    this.cargando = true;
    try {
      this.articulos = await this.supabaseService.getCarrito();
      this.calcularTotal();
    } catch (e) {
      console.error('Error cargando carrito:', e);
    } finally {
      this.cargando = false;
    }
  }

  calcularTotal() {
    this.total = this.articulos.reduce((sum, item) => {
      const precioUnitario = Number(item.chollos?.precio_actual) || 0;
      return sum + (precioUnitario * item.cantidad);
    }, 0);
  }

  async incrementarCantidad(item: any) {
    try {
      item.cantidad++;
      this.calcularTotal();
      await this.supabaseService.actualizarCantidadCarrito(item.id, item.cantidad);
    } catch (e) {
      item.cantidad--; // Revert
      this.calcularTotal();
    }
  }

  async decrementarCantidad(item: any) {
    if (item.cantidad <= 1) return;
    try {
      item.cantidad--;
      this.calcularTotal();
      await this.supabaseService.actualizarCantidadCarrito(item.id, item.cantidad);
    } catch (e) {
      item.cantidad++;
      this.calcularTotal();
    }
  }

  async eliminarItem(item: any) {
    try {
      await this.supabaseService.eliminarDelCarrito(item.id);
      this.articulos = this.articulos.filter(a => a.id !== item.id);
      this.calcularTotal();

      const toast = await this.toastCtrl.create({
        message: 'Producto eliminado correctamente',
        duration: 2000,
        position: 'bottom',
        cssClass: 'toast-carrito'
      });
      await toast.present();
    } catch (e) {
      console.error('Error al eliminar', e);
      const toast = await this.toastCtrl.create({
        message: 'Hubo un error al eliminar. Inténtalo de nuevo.',
        duration: 3000,
        position: 'bottom',
        cssClass: 'toast-carrito'
      });
      await toast.present();
    }
  }

  pagarAhora() {
    if (this.articulos.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (this.procesandoPago) {
      return; // Evitar clicks múltiples
    }

    this.procesandoPago = true;

    // Preparar datos de la compra
    const articulosParaGuardar = this.articulos.map(item => ({
      chollo_id: item.chollos?.id,
      titulo: item.chollos?.titulo,
      precio: item.chollos?.precio_actual,
      cantidad: item.cantidad,
      imagen_url: item.chollos?.imagen_url
    }));

    // Guardar la compra en el historial
    this.supabaseService.guardarCompra(articulosParaGuardar, this.total)
      .then((compraCreada) => {
        // Mostrar confirmación
        alert(`✓ Compra realizada exitosamente!\n\nNúmero de pedido: ${compraCreada.numero_pedido}\nTotal: ${this.total.toFixed(2)}€`);

        // Limpiar el carrito
        this.limpiarCarrito();

        // Redirigir al historial de compras
        this.router.navigate(['/tabs/historial']);
      })
      .catch((error) => {
        console.error('Error al procesar compra:', error);
        const mensajeError = error?.message || 'Error desconocido al procesar la compra';
        alert(`❌ Error al procesar la compra:\n${mensajeError}`);
      })
      .finally(() => {
        this.procesandoPago = false;
      });
  }

  async limpiarCarrito() {
    try {
      // Eliminar todos los artículos del carrito
      for (const item of this.articulos) {
        await this.supabaseService.eliminarDelCarrito(item.id);
      }
      this.articulos = [];
      this.calcularTotal();
    } catch (e) {
      console.error('Error al limpiar el carrito:', e);
    }
  }

  irAInicio() {
    this.router.navigate(['/tabs/tab1']);
  }
}
