  import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonModal,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
  openOutline,
  bagOutline
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
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonModal,
    IonGrid,
    IonRow,
    IonCol
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
      bagOutline
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
    
    try {
      this.detallesActuales = await this.apiService.obtenerDetallesCompra(compra.id);
    } catch (e) {
      console.error('Error cargando detalles:', e);
      alert('Error al cargar los detalles de la compra');
      this.modalAbierto = false;
    } finally {
      this.cargandoDetalles = false;
    }
  }

  cerrarModal() {
    this.modal.dismiss();
    this.modalAbierto = false;
    this.detallesActuales = null;
  }

  getEstadoBadgeColor(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'cancelada':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'completada':
        return '✓ Completada';
      case 'pendiente':
        return '⏳ Pendiente';
      case 'cancelada':
        return '✕ Cancelada';
      default:
        return estado;
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'checkmark-circle-outline';
      case 'cancelada':
        return 'close-circle-outline';
      default:
        return 'time-outline';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }
}
