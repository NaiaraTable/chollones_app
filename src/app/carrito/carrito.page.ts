import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonFooter, IonSpinner, IonButtons, IonBackButton, AlertController, ToastController, IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline, bagCheckOutline, bagOutline } from 'ionicons/icons';

import { ApiService } from '../services/api.service';
import { StripeService } from '../services/stripe.service';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonFooter, IonSpinner, IonButtons, IonBackButton, IonModal
  ]
})
export class CarritoPage implements OnInit {
  articulos: any[] = [];
  cargando = true;
  total = 0;
  procesandoPago = false;
  modalPagoAbierto = false;
  clientSecret = '';
  intentId = '';

  constructor(
    private apiService: ApiService,
    private stripeService: StripeService,
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
      this.articulos = await this.apiService.getCarrito();
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
      await this.apiService.actualizarCantidadCarrito(item.id, item.cantidad);
    } catch (e) {
      item.cantidad--;
      this.calcularTotal();
    }
  }

  async decrementarCantidad(item: any) {
    if (item.cantidad <= 1) return;
    try {
      item.cantidad--;
      this.calcularTotal();
      await this.apiService.actualizarCantidadCarrito(item.id, item.cantidad);
    } catch (e) {
      item.cantidad++;
      this.calcularTotal();
    }
  }

  async eliminarItem(item: any) {
    try {
      await this.apiService.eliminarDelCarrito(item.id);
      this.articulos = this.articulos.filter(a => a.id !== item.id);
      this.calcularTotal();

      const toast = await this.toastCtrl.create({
        message: 'Producto eliminado correctamente',
        duration: 2000,
        position: 'top',
        cssClass: 'toast-carrito'
      });
      await toast.present();
    } catch (e) {
      console.error('Error al eliminar', e);
      const toast = await this.toastCtrl.create({
        message: 'Hubo un error al eliminar. Inténtalo de nuevo.',
        duration: 3000,
        position: 'top',
        cssClass: 'toast-carrito'
      });
      await toast.present();
    }
  }

  async pagarAhora() {
    if (this.articulos.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (this.procesandoPago) {
      return;
    }

    console.log('💳 [PAGO] iniciando pagarAhora()...');
    let preparandoIntent = true;

    try {
      // Preparar datos de la compra
      const articulosParaGuardar = this.articulos.map(item => {
        const precio = Number(item.chollos?.precio_actual) || 0;
        return {
          chollo_id: item.chollos?.id,
          titulo: item.chollos?.titulo || 'Producto sin título',
          precio: precio,
          cantidad: Number(item.cantidad) || 1,
          imagen_url: item.chollos?.imagen_url || null
        };
      });

      // Crear Payment Intent con Stripe
      console.log('💳 [PAGO] Creando Payment Intent...');
      const intentResponse = await this.stripeService.crearPaymentIntent(articulosParaGuardar, this.total);
      
      this.clientSecret = intentResponse.client_secret;
      this.intentId = intentResponse.intent_id;

      console.log('✅ [PAGO] Payment Intent creado:', this.intentId);

      // Abrir modal de pago
      this.modalPagoAbierto = true;
      console.log('🚪 [PAGO] Modal abierto, esperando renderizar elemento...');

      // Crear elemento de pago (que incluye Google Pay, Apple Pay, Card)
      setTimeout(async () => {
        try {
          console.log('🎨 [PAGO] Creando Payment Element...');
          await this.stripeService.crearPaymentElement(this.clientSecret, 'payment-element');
          console.log('✅ [PAGO] Payment Element creado successfully');
          preparandoIntent = false;
        } catch (e) {
          console.error('❌ [PAGO] Error creando elemento de pago:', e);
          alert('Error al cargar el formulario de pago');
          this.modalPagoAbierto = false;
          preparandoIntent = false;
        }
      }, 500);

    } catch (error: unknown) {
      console.error('❌ [PAGO] Error al crear Payment Intent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al procesar el pago: ${errorMessage}`);
      preparandoIntent = false;
    }
  }

  async confirmarPago() {
    try {
      console.log('🔄 [PAGO] Iniciando confirmarPago()...');
      
      if (!this.clientSecret || !this.intentId) {
        console.error('❌ [PAGO] Datos incompletos:', { clientSecret: !!this.clientSecret, intentId: !!this.intentId });
        throw new Error('Datos de pago incompletos');
      }

      this.procesandoPago = true;
      console.log('⏳ [PAGO] Set procesandoPago = true');

      console.log('📱 [PAGO] Confirmando pago con Stripe...');
      
      // Confirmar con Stripe
      const stripeResult = await this.stripeService.confirmarPaymentElement(this.clientSecret);
      console.log('✔ [PAGO] Respuesta de Stripe:', stripeResult);

      if (stripeResult.error) {
        console.error('❌ [PAGO] Error de Stripe:', stripeResult.error);
        throw new Error(stripeResult.error.message);
      }

      if (stripeResult.paymentIntent?.status !== 'succeeded') {
        console.error('❌ [PAGO] Estado incorrecto:', stripeResult.paymentIntent?.status);
        throw new Error('El pago no fue procesado correctamente: ' + stripeResult.paymentIntent?.status);
      }

      console.log('✅ [PAGO] Pago confirmado en Stripe, enviando al servidor...');

      // Confirmar en nuestro servidor
      const articulosParaGuardar = this.articulos.map(item => {
        const precio = Number(item.chollos?.precio_actual) || 0;
        return {
          chollo_id: item.chollos?.id,
          titulo: item.chollos?.titulo || 'Producto',
          precio: precio,
          cantidad: Number(item.cantidad) || 1,
          imagen_url: item.chollos?.imagen_url || null
        };
      });

      console.log('📤 [PAGO] Enviando confirmación al servidor:', {
        intentId: this.intentId,
        articulosCount: articulosParaGuardar.length,
        total: this.total
      });

      const confirmResponse = await this.confirmarPagoEnServidor(this.intentId, articulosParaGuardar, this.total);
      console.log('✅ [PAGO] Respuesta del servidor:', confirmResponse);

      // Éxito
      console.log('🎉 [PAGO] ¡Pago realizado exitosamente!');
      alert(`✓ ¡Pago realizado exitosamente!\n\nNúmero de orden: ${confirmResponse.numero_orden}\nTotal: ${this.total.toFixed(2)}€`);

      // Cerrar modal
      this.modalPagoAbierto = false;
      console.log('🚪 [PAGO] Modal cerrado');

      // Limpiar carrito
      await this.limpiarCarrito();
      console.log('🗑️ [PAGO] Carrito limpiado');

      // Redirigir al historial
      console.log('🔄 [PAGO] Redirigiendo al historial...');
      this.router.navigate(['/tabs/historial']);

    } catch (error: unknown) {
      console.error('❌ [PAGO] Error en confirmarPago:', error);
      const errorMessage = error instanceof Error ? error.message : 'Por favor intenta de nuevo';
      alert(`Error al procesar el pago: ${errorMessage}`);
    } finally {
      this.procesandoPago = false;
      console.log('⏹️ [PAGO] Set procesandoPago = false');
    }
  }

  private async confirmarPagoEnServidor(intentId: string, articulos: any[], total: number): Promise<any> {
    try {
      console.log('🖥️ [API] Enviando confirmación al servidor PHP...');
      console.log('📋 [API] Body a enviar:', {
        stripe_intent_id: intentId,
        articulosCount: articulos.length,
        total: total
      });

      const response = await fetch('/api/procesar-pago.php?action=confirmar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chollones_token') || ''}`
        },
        body: JSON.stringify({
          stripe_intent_id: intentId,
          articulos,
          total
        })
      });

      console.log('📨 [API] Respuesta status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ [API] Error HTTP:', response.status);
        const errorText = await response.text();
        console.error('❌ [API] Response text:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || `Error HTTP ${response.status}`);
        } catch {
          throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }
      }

      const responseJson = await response.json();
      console.log('✅ [API] Respuesta JSON del servidor:', responseJson);

      if (!responseJson.success) {
        console.error('❌ [API] Success=false en respuesta:', responseJson);
        throw new Error(responseJson.error || 'El servidor respondió con error');
      }

      return responseJson;
    } catch (error) {
      console.error('❌ [API] Error en confirmarPagoEnServidor:', error);
      throw error;
    }
  }

  async limpiarCarrito() {
    try {
      for (const item of this.articulos) {
        await this.apiService.eliminarDelCarrito(item.id);
      }
      this.articulos = [];
      this.calcularTotal();
    } catch (e) {
      console.error('Error al limpiar el carrito:', e);
    }
  }

  cerrarModalPago() {
    this.modalPagoAbierto = false;
    this.procesandoPago = false;
  }

  irAInicio() {
    this.router.navigate(['/tabs/tab1']);
  }
}
