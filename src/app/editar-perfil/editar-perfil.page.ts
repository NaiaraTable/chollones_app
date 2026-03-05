import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonButton, IonIcon,
    IonList, IonItem, IonInput, IonAvatar, IonSpinner,
    IonDatetime, IonDatetimeButton, IonModal, IonLabel,
    ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    cameraOutline, personOutline, callOutline,
    locationOutline, lockClosedOutline, calendarOutline
} from 'ionicons/icons';

import { ApiService } from '../services/api.service';

@Component({
    selector: 'app-editar-perfil',
    templateUrl: './editar-perfil.page.html',
    styleUrls: ['./editar-perfil.page.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonButtons, IonBackButton, IonButton, IonIcon,
        IonList, IonItem, IonInput, IonAvatar, IonSpinner,
        IonDatetime, IonDatetimeButton, IonModal, IonLabel
    ]
})
export class EditarPerfilPage implements OnInit {

    avatarUrl = '';
    fullName = '';
    phone = '';
    address = '';
    birthDate = '';
    newPassword = '';
    confirmPassword = '';
    saving = false;
    savingPassword = false;

    constructor(
        private supabase: ApiService,
        private toastCtrl: ToastController
    ) {
        addIcons({ cameraOutline, personOutline, callOutline, locationOutline, lockClosedOutline, calendarOutline });
    }

    ngOnInit() {
        const user = this.supabase.userValue;
        if (user) {
            this.fullName = user.user_metadata?.['full_name'] || '';
            this.phone = user.user_metadata?.['phone'] || '';
            this.address = user.user_metadata?.['address'] || '';
            this.birthDate = user.user_metadata?.['birth_date'] || '';
            this.avatarUrl = user.user_metadata?.['avatar_url'] || '';
        }
    }

    /** Seleccionar y subir avatar */
    async onAvatarSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        try {
            this.showToast('Subiendo foto...', 'primary');
            const url = await this.supabase.uploadAvatar(file);
            this.avatarUrl = url;
            this.showToast('✅ Foto actualizada', 'success');
        } catch (err: any) {
            this.showToast('❌ Error al subir foto: ' + (err.message || err), 'danger');
        }
    }

    /** Guardar datos del perfil */
    async guardarPerfil() {
        this.saving = true;
        try {
            await this.supabase.updateProfile({
                full_name: this.fullName,
                phone: this.phone,
                address: this.address,
                birth_date: this.birthDate
            });
            this.showToast('✅ Perfil actualizado correctamente', 'success');
        } catch (err: any) {
            this.showToast('❌ Error: ' + (err.message || err), 'danger');
        } finally {
            this.saving = false;
        }
    }

    /** Cambiar contraseña */
    async cambiarPassword() {
        if (!this.newPassword || this.newPassword.length < 6) {
            this.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.showToast('Las contraseñas no coinciden', 'warning');
            return;
        }

        this.savingPassword = true;
        try {
            await this.supabase.updatePassword(this.newPassword);
            this.newPassword = '';
            this.confirmPassword = '';
            this.showToast('✅ Contraseña cambiada correctamente', 'success');
        } catch (err: any) {
            this.showToast('❌ Error: ' + (err.message || err), 'danger');
        } finally {
            this.savingPassword = false;
        }
    }

    /** Muestra un toast */
    private async showToast(message: string, color: string) {
        const toast = await this.toastCtrl.create({
            message,
            duration: 2500,
            color,
            position: 'bottom'
        });
        await toast.present();
    }
}
