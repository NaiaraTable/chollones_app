import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonSegment, IonSegmentButton,
    IonLabel, IonSpinner, IonIcon, IonButton, IonCard, IonBadge,
    ToastController
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { pricetagsOutline, ticketOutline } from 'ionicons/icons';
import { ApiService } from '../services/api.service';

@Component({
    selector: 'app-mis-alertas',
    templateUrl: './mis-alertas.page.html',
    styleUrls: ['./mis-alertas.page.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonButtons, IonBackButton, IonSegment, IonSegmentButton,
        IonLabel, IonSpinner, IonIcon, IonButton, IonCard, IonBadge
    ]
})
export class MisAlertasPage implements OnInit {
    segmento = 'cupones';
    cargando = true;
    ofertas: any[] = [];
    cupones: any[] = [];

    constructor(
        private supabase: ApiService,
        private toastCtrl: ToastController
    ) {
        addIcons({ pricetagsOutline, ticketOutline });
    }

    async ngOnInit() {
        await this.cargarAlertas();
    }

    async cargarAlertas() {
        this.cargando = true;
        try {
            // 1. Obtener todos los guardados del usuario
            const guardados = await this.supabase.getChollosGuardados();

            // 2. Filtrar solo los que tienen descuento
            // (Precio actual < Precio original)
            this.ofertas = guardados
                .map((g: any) => g.chollos) // Extraer el objeto chollo
                .filter((c: any) => {
                    if (!c.precio_original || !c.precio_actual) return false;
                    return c.precio_actual < c.precio_original;
                });

            // 3. Obtener cupones reales desde Supabase
            this.cupones = await this.supabase.getCupones();

        } catch (error) {
            console.error('Error cargando alertas:', error);
        } finally {
            this.cargando = false;
        }
    }

    calcDescuento(chollo: any): number {
        const actual = Number(chollo?.precio_actual || 0);
        const original = Number(chollo?.precio_original || 0);
        if (!actual || !original || original <= actual) return 0;
        return Math.round(((original - actual) / original) * 100);
    }

    async copiarCupon(codigo: string) {
        await navigator.clipboard.writeText(codigo);
        const toast = await this.toastCtrl.create({
            message: `Código ${codigo} copiado`,
            duration: 2000,
            position: 'bottom',
            cssClass: 'toast-carrito'
        });
        toast.present();
    }
}
