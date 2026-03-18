import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonLabel, IonInput, IonButton,
  IonButtons, IonBackButton, IonHeader, IonToolbar, IonTitle,
  IonText, IonIcon
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle } from 'ionicons/icons';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent,
    IonItem, IonLabel, IonInput, IonButton,
    IonButtons, IonBackButton, IonHeader, IonToolbar, IonTitle,
    IonText, IonIcon
  ]
})
export class RegistroPage {
  email    = '';
  password = '';
  nombre   = '';

  constructor(
    private supabase: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ checkmarkCircle, closeCircle });
  }

  // --- Getters de validación en tiempo real ---

  get tieneArroba(): boolean {
    return this.email.includes('@') && this.email.includes('.');
  }

  get tieneMinCaracteres(): boolean {
    return this.password.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get tieneNumero(): boolean {
    return /[0-9]/.test(this.password);
  }

  get passwordValida(): boolean {
    return this.tieneMinCaracteres && this.tieneMayuscula && this.tieneNumero;
  }

  get formularioValido(): boolean {
    return !!this.nombre.trim() && this.tieneArroba && this.passwordValida;
  }

  // --- Registro ---

  async registrarse() {
    if (!this.nombre.trim()) {
      this.mostrarAlerta('Nombre requerido', 'Por favor, introduce tu nombre completo.');
      return;
    }

    if (!this.tieneArroba) {
      this.mostrarAlerta('Email inválido', 'El email debe contener @ y un dominio válido (ej: correo@gmail.com).');
      return;
    }

    if (!this.tieneMinCaracteres) {
      this.mostrarAlerta('Contraseña corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!this.tieneMayuscula) {
      this.mostrarAlerta('Contraseña débil', 'La contraseña debe contener al menos una letra mayúscula.');
      return;
    }

    if (!this.tieneNumero) {
      this.mostrarAlerta('Contraseña débil', 'La contraseña debe contener al menos un número.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' });
    await loading.present();

    try {
      const res = await this.supabase.registro(this.email, this.password, this.nombre);
      await loading.dismiss();

      if (res && res.error) {
        this.mostrarAlerta('Error', res.error.message);
      } else {
        this.mostrarAlerta('¡Éxito!', 'Cuenta creada. Ahora puedes iniciar sesión.');
        this.router.navigateByUrl('/tabs/login');
      }
    } catch (err) {
      await loading.dismiss();
      this.mostrarAlerta('Error', 'No se pudo conectar con el servidor.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }
}
