import { Component, OnInit } from '@angular/core';
import {AlertController, ToastController} from "@ionic/angular";
import {addIcons} from "ionicons";
import { lockClosedOutline, mailOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import {
  IonBackButton, IonButton, IonButtons,
  IonContent, IonHeader,
  IonIcon, IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote, IonSpinner,
  IonTitle, IonToolbar
} from "@ionic/angular/standalone";
import {ApiService} from "../services/api.service";
import {NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-seguridad',
  templateUrl: './seguridad.page.html',
  styleUrls: ['./seguridad.page.scss'],
  imports: [
    IonNote,
    IonItem,
    IonIcon,
    IonLabel,
    IonList,
    IonContent,
    IonTitle,
    IonBackButton,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonInput,
    IonSpinner,
    NgIf,
    FormsModule
  ]
})
export class SeguridadPage  implements OnInit {

  newPassword = '';
  confirmPassword = '';
  savingPassword = false;

  constructor(
    private supabase: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ lockClosedOutline, mailOutline, shieldCheckmarkOutline });
  }

  ngOnInit() {}


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
      duration: 2000,
      position: 'bottom',
      cssClass: 'toast-carrito'
    });
    await toast.present();
  }
}
