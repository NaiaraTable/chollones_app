import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonInput, IonAvatar, IonSpinner,
  IonLabel,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline, personOutline, callOutline,
  locationOutline, lockClosedOutline, calendarOutline,
  checkmarkCircle, closeCircle
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
    IonLabel
  ]
})
export class EditarPerfilPage implements OnInit, OnDestroy {

  avatarUrl = '';
  fullName = '';
  phone = '';
  address = '';
  birthDate = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;
  savingPassword = false;


  // Fecha máxima = hoy (no permite fechas futuras)
  today = new Date().toISOString().split('T')[0];

  constructor(
    private supabase: ApiService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      cameraOutline, personOutline, callOutline,
      locationOutline, lockClosedOutline, calendarOutline,
      checkmarkCircle, closeCircle
    });
  }

  private userSub: any;

  ngOnInit() {
    // Suscripción: espera a que el usuario cargue del servidor
    this.userSub = this.supabase.currentUser$.subscribe(user => {
      if (user) {
        const u = user as any;
        // Los campos pueden estar en user_metadata o directamente en el objeto raíz
        this.fullName = u.user_metadata?.['full_name'] || u.display_name || u.full_name || '';
        this.phone = u.user_metadata?.['phone'] || u.phone || '';
        this.address = u.user_metadata?.['address'] || u.address || '';
        this.birthDate = u.user_metadata?.['birth_date'] || u.birth_date || '';
        this.avatarUrl = u.user_metadata?.['avatar_url'] || u.avatar_url || '';
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  // --- Teléfono: solo números, espacios y + ---
  onPhoneInput(event: any) {
    const valor = event.target?.value || '';
    // Elimina cualquier carácter que no sea número, +, espacio o guión
    this.phone = valor.replace(/[^0-9+\s\-]/g, '');
    // Actualizar el input visualmente
    if (event.target) event.target.value = this.phone;
  }

  // --- Getters de validación de contraseña ---

  get tieneMinCaracteres(): boolean {
    return this.newPassword.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get tieneNumero(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get passwordsCoinciden(): boolean {
    return this.newPassword.length > 0 && this.newPassword === this.confirmPassword;
  }

  get passwordValida(): boolean {
    return this.tieneMinCaracteres && this.tieneMayuscula && this.tieneNumero && this.passwordsCoinciden;
  }

  // --- Fecha de nacimiento formateada para mostrar ---
  get fechaFormateada(): string {
    if (!this.birthDate) return '';
    try {
      const fecha = new Date(this.birthDate);
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return this.birthDate;
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
      this.showToast(' Foto actualizada', 'success');
    } catch (err: any) {
      this.showToast(' Error al subir foto: ' + (err.message || err), 'danger');
    }
  }

  /** Guardar datos del perfil */
  async guardarPerfil() {
    if (!this.fullName.trim()) {
      this.showToast('El nombre no puede estar vacío', 'warning');
      return;
    }
    this.saving = true;
    try {
      await this.supabase.updateProfile({
        full_name: this.fullName,
        phone: this.phone,
        address: this.address,
        birth_date: this.birthDate
      });
      this.showToast(' Perfil actualizado correctamente', 'success');
    } catch (err: any) {
      this.showToast(' Error: ' + (err.message || err), 'danger');
    } finally {
      this.saving = false;
    }
  }

  /** Cambiar contraseña */
  async cambiarPassword() {
    if (!this.tieneMinCaracteres) {
      this.showToast('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }
    if (!this.tieneMayuscula) {
      this.showToast('La contraseña debe tener al menos una mayúscula', 'warning');
      return;
    }
    if (!this.tieneNumero) {
      this.showToast('La contraseña debe tener al menos un número', 'warning');
      return;
    }
    if (!this.passwordsCoinciden) {
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
      this.showToast(' Error: ' + (err.message || err), 'danger');
    } finally {
      this.savingPassword = false;
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      cssClass: 'toast-carrito'
    });
    await toast.present();
  }
}
