import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonBadge,
  IonModal,
  IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
  openOutline,
  bagOutline,
  chevronForwardOutline,
  cubeOutline,
  pricetagOutline,
  walletOutline,
  chevronDownOutline,
  bagCheckOutline,
  logoGoogle,
  star,
  starOutline
} from 'ionicons/icons';

import { ApiService } from '../services/api.service';

interface Compra {
  id: number;
  numero_pedido: string;
  fecha_compra: string;
  total: number;
  estado: string;
  cantidad_items: number;
  articulos_count: number;
  articulos_preview: Array<{ titulo: string; imagen_url: string; cantidad: number }>;
}

interface DetallesCompra extends Compra {
  articulos: any[];
}

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonBadge,
    IonModal,
    IonTextarea
  ]
})
export class HistorialPage implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  compras: Compra[] = [];
  cargando = true;
  sinCompras = false;

  // Modal de detalles
  modalAbierto = false;
  detallesActuales: DetallesCompra | null = null;
  cargandoDetalles = false;

  // Lógica de Feedback/Reseñas
  estrellasSeleccionadas = 0;
  comentarioInterno = '';
  enviandoFeedback = false;
  feedbackEnviado = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    addIcons({
      chevronBackOutline,
      checkmarkCircleOutline,
      timeOutline,
      closeCircleOutline,
      openOutline,
      bagOutline,
      chevronForwardOutline,
      cubeOutline,
      pricetagOutline,
      walletOutline,
      chevronDownOutline,
      bagCheckOutline,
      logoGoogle,
      star,
      starOutline
    });
  }

  ngOnInit() {
    this.cargarHistorial();
  }

  ionViewWillEnter() {
    this.cargarHistorial();
  }

  async cargarHistorial() {
    this.cargando = true;
    try {
      this.compras = await this.apiService.getHistorialCompras();
      this.sinCompras = this.compras.length === 0;
    } catch (e) {
      console.error('Error cargando historial:', e);
      this.sinCompras = true;
    } finally {
      this.cargando = false;
    }
  }

  async abrirDetalles(compra: Compra) {
    this.cargandoDetalles = true;
    this.modalAbierto = true;
    // Resetear feedback al abrir
    this.estrellasSeleccionadas = 0;
    this.comentarioInterno = '';
    this.feedbackEnviado = false;

    try {
      this.detallesActuales = await this.apiService.obtenerDetallesCompra(compra.id);
    } catch (e) {
      console.error('Error cargando detalles:', e);
      this.modalAbierto = false;
    } finally {
      this.cargandoDetalles = false;
    }
  }

  seleccionarEstrellas(n: number) {
    this.estrellasSeleccionadas = n;
    if (n >= 4) {
      // Redirección directa a Google si son 4 o 5 estrellas
      const url = `https://www.google.com/search?newwindow=1&sca_esv=484202b0491193e0&sxsrf=ANbL-n4Kzh1-TTGMghAK6HMwjMKSnVfSYQ:1774444629224&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOdneXHFjpY5OmMn2YSHUuxEp54HlOVNGcngZA_PO3QCmtwAcJsfq7-uSqYu3jq8_18jtOLvr1yOvXXPwyXSrf4UAC1ta&q=Chollones+Rese%C3%B1as&sa=X&ved=2ahUKEwi5rLGukbuTAxURTaQEHfxuH1wQ0bkNegQIHBAF&biw=1536&bih=730&dpr=1.25`;
      window.open(url, '_system');
    }
  }

  async enviarFeedbackInterno() {
    if (!this.comentarioInterno.trim()) return;
    this.enviandoFeedback = true;
    try {
      // Aquí iría tu llamada al API de chollones.com
      // await this.apiService.enviarCriticaInterna(this.detallesActuales.id, this.estrellasSeleccionadas, this.comentarioInterno);

      // Simulación de éxito
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.feedbackEnviado = true;
    } catch (e) {
      console.error('Error enviando feedback:', e);
    } finally {
      this.enviandoFeedback = false;
    }
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.detallesActuales = null;
  }

  getEstadoBadgeColor(estado: string): string {
    switch (estado) {
      case 'completada': return 'success';
      case 'pendiente': return 'warning';
      case 'cancelada': return 'danger';
      default: return 'medium';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'completada': return '✓ Completada';
      case 'pendiente': return '⏳ Pendiente';
      case 'cancelada': return '✕ Cancelada';
      default: return estado;
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'completada': return 'checkmark-circle-outline';
      case 'cancelada': return 'close-circle-outline';
      default: return 'time-outline';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }
}
